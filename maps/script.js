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

// script.js
// Authors: kylephillips@ bencobley@

import * as aistudio from "./aistudio.js";
import * as mapsFunction from "./function-declarations.js";
import { presets } from "./presets.js";
import {
  html,
  render,
} from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";

const systemInstructions = mapsFunction.systemInstructions;

const functionDeclarations = mapsFunction.declarations.map(declaration => ({
  ...declaration,
  callback: (args) => {
    const { location, caption } = args;
    renderPage(location, caption);
  },
}));

let chat;

async function init() {
  renderPage("%"); // Start by rendering with empty location query: shows earth
  try {
    const initResult = await aistudio.init({
      systemInstructions,
      functionDeclarations,
    });

    // Handle light or dark theme from parent
    if (initResult.theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else if (initResult.theme === "system") {
      if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        document.documentElement.removeAttribute("data-theme"); // Use default (dark)
      } else {
        document.documentElement.setAttribute("data-theme", "light");
      }
    }

    aistudio.chat("Welcome to Map Explorer!");

    chat = async (userText) => {
      try {
        const temperature = 2; // High temperature for answer variety
        const response = await aistudio.generateContent({ userText, temperature });
        console.log(response);
      } catch (e) {
        console.error(e);
      }
    };
  } catch (error) {
    console.error("Error initializing AI Studio:", error);
  }
}

init();

function renderPage(location, caption = "") {
  const root = document.querySelector("#root");
  caption = caption.replace(/\\/g, '');
  render(
    html`
      <div id="map">${mapsFunction.embed(location)}</div>
      ${caption
        ? html`<div id="caption"><p>${caption}</p></div>`
        : ""}
      <div id="presets-container">
      <span id="take-me-somewhere">Take me somewhere...</span>
        <div id="presets">
              ${presets.map(
          ([name, message]) =>
            html`<button @click=${() => chat(message)} class="preset">
                    ${name}
                  </button>`
        )}
        </div>
      </div>
    `,
    root
  );
}
