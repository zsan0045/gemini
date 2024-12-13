# AI Studio Starter Applets

This repository contains the source code for AI Studio's
[starter apps](https://aistudio.google.com/app/starter-apps) — a collection of
small apps that demonstrate how Gemini can be used to create interactive
experiences.

Currently, these apps are built to run inside AI Studio, but in the near future
we'll update them to run standalone using the
[Gemini API](https://ai.google.dev/gemini-api/docs). These examples should give
you an idea of how to get started.

## [Spatial](/spatial/)

[Spatial Understanding](https://aistudio.google.com/app/starter-apps/spatial) is
a simple demonstration of Gemini's 2D and 3D spatial understanding and reasoning
capabilities. It was built with React.

This example should give you an idea of how to get started with spatial analysis
using Gemini. Check out [Prompt.tsx](/spatial/src/Prompt.tsx) to see how
bounding box parsing is implemented. To dive deeper into Gemini's spatial
reasoning capabilities, check out this
[Colab notebook](https://github.com/google-gemini/cookbook/blob/main/gemini-2/spatial_understanding.ipynb).

## [Video](/video/)

[Video Explorer](https://aistudio.google.com/app/starter-apps/video) is a simple
app that allows you to explore events within videos using Gemini. It was built
with React.

## [Maps](/maps/)

[Map Explorer](https://aistudio.google.com/app/starter-apps/map) is a simple app
that allows you to explore a map using Gemini and the Google Maps API. It was
built using Lit and the
[Maps Embed API](https://developers.google.com/maps/documentation/embed/get-started).

### Contributors

- [@bencobley](https://github.com/bencobley)
- [@dmotz](https://github.com/dmotz)
- [@grantcuster](https://github.com/grantcuster)
- [@hapticdata](https://github.com/hapticdata)
