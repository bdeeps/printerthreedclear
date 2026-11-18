<!-- glassbox:start -->
<!-- Generated from glassbox.json by the Glassbox hub (npm run readme -- printerthreedclear). Edit glassbox.json, not this block. -->

<h1 align="center">PrinterThreeDClear</h1>

<p align="center"><b>How does a 3D printer work?</b><br>A 3D printer cannot draw a shape. It can only draw one thin slice, then another on top. Slice a model, watch plastic melt through a 0.4 mm nozzle, steer a printer three ways, and break a print on purpose.</p>

<p align="center"><a href="https://glassbox.how/printerthreedclear/"><b>▶ Play with it</b></a> &nbsp;·&nbsp; <a href="https://glassbox.how/e/printerthreedclear/">Read the 60-second explainer</a></p>

<p align="center">
  <a href="https://glassbox.how/e/printerthreedclear/"><img alt="Glassbox No. 227" src="https://img.shields.io/badge/Glassbox-No.%20227-8ef0ff"></a>
  <a href="https://glassbox.how/e/printerthreedclear/"><img alt="Machines" src="https://img.shields.io/badge/field-Machines-ff7a59"></a>
  <a href="LICENSE"><img alt="Code: MIT" src="https://img.shields.io/badge/code-MIT-3fb950"></a>
  <a href="LICENSE-CONTENT.md"><img alt="Content: CC BY 4.0" src="https://img.shields.io/badge/content-CC%20BY%204.0-ef9421"></a>
  <a href="#privacy"><img alt="Privacy: explained" src="https://img.shields.io/badge/privacy-explained-555"></a>
</p>

## In 60 seconds

1. **A stack of slices.** A printer cannot print a shape. A program called a slicer cuts the model into flat layers, typically 0.1 to 0.3 mm thick for plastic, and plans the path the nozzle follows in each one. Every layer gets perimeters for the walls, solid skin on the top and bottom, and sparse infill inside. Where a layer would hang in the air, the slicer adds supports to snap away later.
2. **Filament in, plastic out.** Most desktop printers melt a plastic string 1.75 mm thick. A stepper-driven gear pushes the filament into a heater block, about 190 to 230 °C for PLA and 230 to 250 °C for PETG. The solid filament is the piston: it pushes the melt through a nozzle with a hole usually 0.4 mm wide. Feed too fast or run too cold and the heater cannot melt plastic quickly enough, so the gear skips.
3. **A robot that counts steps.** Stepper motors turn in small exact steps, so the printer can count steps to know where each part is. Belts slide the head and the bed, and lead screws lift the gantry one layer at a time. The bed is heated, around 55 to 60 °C for PLA and 70 to 90 °C for PETG, to keep the first layer stuck and the part from curling.
4. **Three ways to move.** A Cartesian printer has one motor per axis. A CoreXY printer keeps the bed still, and two fixed motors drive belts that combine: together they move the head sideways, in opposition forwards. A delta printer hangs the nozzle from three arms on three towers, and the controller solves the geometry for each point.
5. **Why prints fail.** Plastic shrinks as it cools, so cold beds let corners curl up. Runny plastic oozes during travel moves and leaves strings, which retraction and a cooler nozzle reduce. An overhang droops when each layer is laid mostly over air: the overlap with the layer below is 1 minus layer height times the tangent of the angle, divided by the bead width. A fan lets steeper angles print.
6. **Light, powder and metal.** Resin printers harden liquid photopolymer with light from a laser or a projector, and the part hangs upside down from a plate that lifts a layer at a time. Powder printers fuse a thin layer of nylon with a laser, drop the bed and spread more. The loose powder supports the part. Metal printers melt metal powder under argon and weld the part to a plate with supports.

## Words worth knowing

| Term | Meaning |
|---|---|
| **Slicer** | Software that cuts a 3D model into layers and writes the movement instructions for the printer. |
| **Layer height** | The thickness of one layer. Thinner layers hide the steps but need many more of them. |
| **Perimeter** | A loop of plastic following the outline of a layer. Several together make the wall. |
| **Infill** | A sparse pattern inside the walls that holds them apart for much less plastic. |
| **Support** | Throw-away material printed under an overhang so the layer above has something to sit on. |
| **Filament** | The plastic string, usually 1.75 mm thick, that a filament printer melts and lays down. |
| **Hotend** | The heated part of the printer: heat break, heater block and nozzle. |
| **Stepper motor** | A motor that turns in small fixed steps, so a controller can position it by counting pulses. |
| **CoreXY** | A design with two fixed motors and belts that combine to move the head in X and Y. |
| **Retraction** | Pulling the filament back a little before a travel move so the nozzle does not ooze. |

## A short history

**From a Japanese lab in 1980 and a glue-gun frog to printers that print copies of themselves.**

- **1981** · Kodama hardens plastic with light, layer by layer (Hideo Kodama, Nagoya, Japan)
- **1984** · Hull files the stereolithography patent (Chuck Hull, California, United States)
- **1986** · Deckard patents laser sintering (Carl Deckard (with adviser Joe Beaman), Austin, Texas, United States)
- **1988** · A glue gun and a toy frog (Scott Crump, United States)
- **1989** · Stratasys is founded and the FDM patent is filed (Scott and Lisa Crump, Eden Prairie, Minnesota, United States)
- **1996** · Aachen's lasers melt metal powder (Wilhelm Meiners, Konrad Wissenbach and Andres Gasser, Aachen, Germany)
- **2004** · Bowyer starts RepRap, a printer that can copy itself (Adrian Bowyer, Bath, England)
- **2008** · A printer copies all its own printed parts (RepRap Darwin; Adrian Bowyer and Vik Olliver, Bath, England)

The full story, with 31 moments, charts, people and 36 sources: [glassbox.how/e/printerthreedclear/history](https://glassbox.how/e/printerthreedclear/history/). The data lives in [`history.json`](history.json).

## Privacy

This box has no accounts and no ads, and it ships its own fonts and libraries. When you run it yourself it sends nothing anywhere. On glassbox.how, the site's `/bar.js` also loads Glassbox's analytics: **Google Analytics** to count visits (it asks first in the EU, UK and Switzerland, and stays off when your browser sends Global Privacy Control or Do Not Track) and **ClickTrust** to detect bots.

It remembers a few things **in your own browser only**, and never sends them anywhere:

| Browser storage key | What it holds |
|---|---|
| `printerthreedclear.v1` | Which chapters you have opened, your best quiz scores, and sound on or off. |

Exactly what each one sees is at [glassbox.how/privacy](https://glassbox.how/privacy/).

## Licences

- **Code:** [MIT](LICENSE). Use it, change it, ship it.
- **Explanations, text, images and videos** (`glassbox.json`, `glassbox/`): [CC BY 4.0](LICENSE-CONTENT.md). Credit “Glassbox, glassbox.how/e/printerthreedclear”.
- **Third-party parts** keep their own licences: [three.js](https://threejs.org) (MIT), [Geist, Instrument Serif](https://openfontlicense.org) (SIL OFL 1.1).
- The Glassbox name and logo aren't covered by either licence. See the [terms](https://glassbox.how/terms/).

Found a mistake? [Open an issue](https://github.com/bdeeps/printerthreedclear/issues). Corrections happen in public.
<!-- glassbox:end -->

## Run it

It's plain HTML, CSS and JavaScript. No build step and no dependencies. Run locally, it contacts no other website.

```bash
python3 -m http.server 8000
```

Three.js and the fonts ship in `vendor/` and `fonts/`, so it also works offline.

Then open http://localhost:8000.

## How it's built

| File | What |
|---|---|
| `index.html`, `css/app.css` | The page and its styles |
| `js/app.js`, `js/stage.js`, `js/ui.js`, `js/kit.js` | The shared Glassbox 3D engine: chapters, 3D stage, controls, quiz, video director |
| `js/chapters/*.js` | One file per chapter: the 3D model, controls, text, key terms, quiz and video scenes |
| `glassbox.json` | Title, question, explainer beats, key terms, browser storage and credits shown on glassbox.how |
| `reel` in each chapter | The storyboard the Glassbox studio records into short videos |
| `glassbox/` | The published video, slides, thumbnail and post copy |
| `fonts/`, `vendor/three/` | Self-hosted Geist and Instrument Serif (SIL OFL 1.1) and three.js (MIT) |
