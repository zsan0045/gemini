// Copyright 2024 Google LLC

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     https://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// The promise returned by this function resolves once AI Studio is connected.
//
// It's not possible to make other calls (like generateContent) until this
// connection is ready.
//
// The promise resolves to an object with these properties:
//
//   "theme": the AI Studio theme setting. "dark", "light" or "system".
//
export async function init({
  // The default Gemini model to use in generateContent() requests.
  // A default model will be used if this value is invalid or not supported.
  model = 'models/gemini-1-5-flash-002',

  // A callback function that returns a Promise<string> with a data: URL
  // containing a screenshot of the current app state to send to the model.
  // Screenshots won't be used if this is set to undefined.
  screenshotCallback = undefined,

  // A list of function declarations that the model can invoke on this app.
  // generateContent() will include all of these by default, unless a subset
  // is specified in each generateContent() call. Each function declaration
  // is an object with these properties:
  //
  //   "name": the name of the function as a string
  //   "description: a string describing what the function does
  //   "parameters": a JSON schema listing the parameters to the function
  //   "callback": a function to be invoked when a model response invokes
  //               this function.
  functionDeclarations = [],

  // The initial system instructions, as a string.
  systemInstructions = undefined,

  // A callback function to receive files picked by the user from their Drive.
  // The callback is invoked with an object that has these properties:
  //
  //   "id": a unique file identifier (string). This id can be used in
  //         generateContent() calls, to send the file to the model.
  //   "name": the file name in the user's Drive (string)
  //   "mimeType": the MIME type (string)
  //   "thumbnailUrl": an optional thumbnail of this file (string)
  //   "sizeBytes": the file size in bytes (number)
  fileCallback = undefined,

  // If fileCallback is set then this indicates that image files are supported.
  supportsImages = true,

  // If fileCallback is set then this indicates that video files are supported.
  supportsVideos = true,

  // If fileCallback is set then this indicates that audio files are supported.
  supportsAudio = true
} = {}) {
  takeScreenshotCallback = screenshotCallback
  receiveFileCallback = fileCallback

  const supportsScreenshot = screenshotCallback !== undefined
  const supportsFiles = fileCallback !== undefined

  for (const f of functionDeclarations) {
    functionDeclarationsMap.set(f.name, f.callback)
    delete f.callback
  }

  initData = {
    type: 'init',
    model,
    supportsScreenshot,
    functionDeclarations,
    systemInstructions,
    supportsFiles,
    supportsImages,
    supportsVideos,
    supportsAudio
  }

  if (aistudioOrigin) {
    sendMessage(initData)
    initData = null
    return Promise.resolve(getInitResult())
  } else {
    return new Promise(resolve => {
      initResolve = resolve
    })
  }
}

// Sends a chat message to the chat view.
// These messages are not visible to Gemini.
export function chat(text) {
  sendMessage({type: 'chat', text})
}

// Clears the chat history.
export function clearChat() {
  sendMessage({type: 'clearChat'})
}

// Sets the System Instructions.
export function setSystemInstructions(systemInstructions) {
  sendMessage({type: 'setSystemInstructions', systemInstructions})
}

// Calls Gemini.
//
// This function returns a Promise that resolves once a response is received
// from the model.
//
// It's not possible to make further calls until the previous call has finished.
//
// The Promise resolves to a string with the model's response.
export async function generateContent({
  // The model to call. The model specified in init() will be used by default.
  model = undefined,

  // Whether to request model responses in JSON.
  // NOTE: Function Declarations are *always* disabled when JSON mode is enabled.
  jsonMode = false,

  // If jsonMode is true then this can be used to specify the JSON schema.
  jsonSchema = undefined,

  // The text string to send to the model, as as "user" turn. This is required.
  userText = undefined,

  // Whether to hide this turn in the chat. The text is sent to the model,
  // but isn't shown in the Canvas chat window by default.
  hideUserTurn = false,

  // An optional "data:" URL with an image payload, to include with the user
  // turn.
  imageDataURL = undefined,

  // The optional image size. This helps render a placeholder for the image
  // quickly, to avoid layout shifts.
  imageWidth = 0,
  imageHeight = 0,

  // The list of Function Declarations that should be enabled in this call,
  // specified as a list of strings. Each string identifies one of the Function
  // Declarations passed to init().
  //
  // "undefined" sends ALL Function Declarations passed to init().
  // An empty list can be passed to disable all Function Declarations.
  enabledFunctions = undefined,

  // Whether to clear the chat history before appending this interaction.
  clearChat = false,

  // A list of string file IDs to send to the model.
  // Only IDs previously received in a "fileCallback" can be used.
  files = []
} = {}) {
  if (generateContentResolve) {
    throw new Error("Previous call to generateContent hasn't finished yet")
  }

  if (typeof userText !== 'string') {
    throw new Error('userText must be a string')
  }

  return new Promise(resolve => {
    generateContentResolve = resolve

    generateContentPendingRequestId = `${generateContentNextRequestId++}`

    const message = {
      type: 'sendToModel',
      requestId: generateContentPendingRequestId,
      model,
      jsonMode,
      jsonSchema,
      userText,
      hideUserTurn,
      imageDataURL,
      enabledFunctions,
      clearChat,
      files
    }

    if (imageWidth > 0) {
      message.imageWidth = imageWidth
    }

    if (imageHeight > 0) {
      message.imageHeight = imageHeight
    }

    sendMessage(message)
  })
}

// Fetches a Blob with a file's contents.
// Returns a Promise that resolves to a Blob.
export async function getFileContents(id) {
  let request = fileContentsMap.get(id)

  if (request) {
    return request.promise
  }

  request = {}

  request.promise = new Promise((resolve, reject) => {
    request.resolve = resolve
    request.reject = reject
  })

  fileContentsMap.set(id, request)

  sendMessage({type: 'getFileContents', id})

  return request.promise
}

///////////////////////////////
//                           //
//  Implementation details.  //
//                           //
///////////////////////////////

let aistudioOrigin = ''
let aistudioTheme = 'system'

let initData = null
let initResolve = null

let takeScreenshotCallback = null
let receiveFileCallback = null

let generateContentPendingRequestId = ''
let generateContentNextRequestId = 0
let generateContentResolve = null

const functionDeclarationsMap = new Map()
const fileContentsMap = new Map()

function sendMessage(message) {
  if (aistudioOrigin) {
    window.parent.postMessage(message, aistudioOrigin)
  } else {
    throw new Error("init hasn't finished yet")
  }
}

function onModelResponse(requestId, text) {
  if (requestId !== generateContentPendingRequestId) {
    console.error(
      `Unexpected message from AI Studio for requestId ${requestId}`
    )
    return
  }
  if (!generateContentResolve) {
    console.error('Unexpected model response from AI Studio')
    return
  }
  generateContentPendingRequestId = ''
  const resolve = generateContentResolve
  generateContentResolve = null
  resolve(text)
}

function onFunctionCall(name, args) {
  const callback = functionDeclarationsMap.get(name)
  if (callback) {
    callback(args)
  } else {
    console.error(`Invalid model Function Call to unknown function "${name}"`)
  }
}

function onFileContents(id, blob, error) {
  const request = fileContentsMap.get(id)

  if (request) {
    if (error && request.reject) {
      const reject = request.reject
      delete request.resolve
      delete request.reject
      reject(error)
      return
    } else if (blob && request.resolve) {
      const resolve = request.resolve
      delete request.resolve
      delete request.reject
      resolve(blob)
      return
    }
  }

  console.error('Received unexpected file contents for', id)
}

async function onMessage(event) {
  const data = event.data

  switch (data.type) {
    case 'init':
      aistudioOrigin = event.origin
      aistudioTheme = data.theme
      if (initData) {
        sendMessage(initData)
        initData = null
        if (initResolve) {
          initResolve(getInitResult())
          initResolve = null
        }
      }
      break

    case 'screenshot':
      const dataURL = await takeScreenshotCallback()
      sendMessage({type: 'screenshot', dataURL})
      break

    case 'functionCall':
      onFunctionCall(data.name, data.args)
      break

    case 'modelResponse':
      onModelResponse(data.requestId, data.text)
      break

    case 'fileMetadata':
      delete data.type
      receiveFileCallback(data)
      break

    case 'fileContents':
      onFileContents(data.id, data.blob, data.error)
      break

    default:
      // console.log('Received unknown message from AI Studio:', data.type)
      // console.dir(data)
      break
  }
}

function getInitResult() {
  return {theme: aistudioTheme}
}

window.addEventListener('message', onMessage)
