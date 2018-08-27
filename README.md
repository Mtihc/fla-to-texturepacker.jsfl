# Fla to TexturePacker
Export the top layers/folders of all timelines in a .fla file to PNG sequences and then pack them into a spritesheet using TexturePacker.

# Install
1. Buy and Install [Adobe Animate](https://www.adobe.com/products/animate.html) and [TexturePacker](https://www.codeandweb.com/texturepacker)
1. Open TexturePacker and select "Install Command Line Tool" from the menu.
1. Run [install jsfl scripts.jsfl](https://github.com/Mtihc/fla-to-texturepacker.jsfl/blob/master/install%20jsfl%20scripts.jsfl) with Animate.exe

# Using the Command menu
1. Open Animate.exe
1. From the Command menu, select [Export with TexturePacker](https://github.com/Mtihc/fla-to-texturepacker.jsfl/blob/master/Configuration/Commands/Export%20with%20TexturePacker.jsfl)

# Using a script
1. Save the following script in a folder that has a couple of .fla files in it.
2. Run it with Animate.exe
```javascript
fl.runScript(fl.configURI + "Javascript/SpritesheetCI.Exporter.jsfl");

var scriptDir = SpritesheetCI.Path.getFolderPath(fl.scriptURI);

var exporter = new SpritesheetCI.Exporter();

exporter.exportDocument(scriptDir + "A.fla");
exporter.exportDocument(scriptDir + "B.fla");
exporter.exportDocument(scriptDir + "C.fla");

```
