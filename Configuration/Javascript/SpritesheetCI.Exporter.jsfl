/********************************************************************************
 * Name: Export .fla to PNGs
 * Description: Functions for exporting PNG sequences per layer
 * Author: Mitch Stoffels
 * License: MIT
 ********************************************************************************/

fl.runScript(fl.configURI + "Javascript/SpritesheetCI.jsfl");
fl.runScript(fl.configURI + "Javascript/TexturePacker.jsfl");

(function (SpritesheetCI) {
	
	function extend() {
		for (var o = arguments[0], i = 1; i < arguments.length; i++) {
			if (arguments[i] === undefined) continue;
			for (var k in arguments[i]) {
				if (arguments[i].hasOwnProperty(k)) {
					o[k] = arguments[i][k] && arguments[i][k].constructor === Object ? extend({}, o[k] || {}, arguments[i][k]) : arguments[i][k];
				}
			}
		}
		return o;
	}
	
	/*
	 * Constructor for the Exporter class.
	 */
	function Exporter (defaultOptions) {
		this.defaultOptions = extend({}, Exporter.prototype.defaultOptions, defaultOptions);
	};
	
	/*
	 * Members of the Exporter class.
	 */
	Exporter.prototype = {
		/*
		 * These default options can be overridden
		 * by the constructor and also
		 * by each call to exportDocument.
		 */
		defaultOptions: {
			'dryrun': false,
			'labelsLayerNamePattern': /LABELS|LABEL/i,
			
			'spriteURIFormat': "${workDir}/${frameLabelNumber}-${frameLabel}_Z${layerNumberRelativeToParent}-${layerName}_F${frameNumberRelativeToLabel}.png",
			
			'numberPadding': {
				'layerNumber': 2,
				'layerNumberRelativeToPath': 2,
				'sortOrder': 2,
				'frameNumber': 2,
				'frameNumberRelativeToLabel': 2,
				'frameLabelNumber': 2,
				'frameLabelNumber': 2,
			},
			'texturePacker': extend({}, TexturePacker.prototype.defaultOptions)
		},
		
		exportDocument: function (flaURI, sheetURI, options) {
			// sheetURI is an optional, positional argument
			if (arguments.length == 2 && typeof sheetURI === "object") {
				options = sheetURI;
				sheetURI = undefined;
			}
			// copy defaults
			options = extend({}, this.defaultOptions, options);
			
			// validate flaURI
			flaURI = SpritesheetCI.Path.validateFilePath(flaURI, 'fla');
			
			var flaFolder = flaURI.substr(0, flaURI.lastIndexOf("/") + 1);
			var flaName = flaURI.substring(flaURI.lastIndexOf("/") + 1, flaURI.lastIndexOf("."));
			
			// validate sheetURI
			sheetURI = sheetURI || (flaFolder + flaName + (options.texturePacker.multipack ? "-{n1}" : "" ) + "." + options.texturePacker['texture-format']);
			sheetURI = SpritesheetCI.Path.validateFilePath(sheetURI, options.texturePacker['texture-format']);
			
			// validate options
			if (typeof options.spriteURIFormat !== "string" || options.spriteURIFormat.indexOf("${workDir}") != 0) {
				throw new Error("'options.spriteURIFormat' should be a string that starts with '${workDir}'.")
			}
			
			// open document
			var doc = fl.openDocument(flaURI);
			
			var workDir = flaFolder + flaName + '-' + Date.now().toString(16) + "/";
			
			// get logger
			var logger = SpritesheetCI.getLogger(flaFolder + flaName + ".log");
			logger.trace = true;
			logger.remove();
			
			logger.info("Exporting document: " + FLfile.uriToPlatformPath(flaURI));
			
			var result;
			try {
				var timelines = doc.timelines;
				logger.info("Timelines: " + timelines.length);
				
				for (var t=0; t < timelines.length; t++) {
					var timeline = timelines[t];
					
					logger.info("  Timeline: " + timeline.name + " (" + timeline.frameCount + " frames)");
					
					doc.editScene(doc.timelines.indexOf(timeline));
					
					var labelsLayer = SpritesheetCI.layer(options.labelsLayerNamePattern, timeline);
					
					var layers = timeline.layers;
					for (var layerNumber=0; layerNumber<layers.length; layerNumber++) {
						var layer = layers[layerNumber];
						
						if (!(layer.parentLayer == null && ["normal", "folder"].indexOf(layer.layerType) > -1 && options.labelsLayerNamePattern.exec(layer.name) == null)) {
							continue;
						}
				
						logger.info("    "+(layer.layerType == "folder" ? "Folder" : (layer.layerType == "normal" ? "Layer " : layer.layerType) )+" "+layerNumber+": "+layer.name);
						
						// hide other layers
						for (var i = 0; i < layers.length; i++) {
							layers[i].visible = false;
						}
						delete i;
						layer.visible = true;
						
						logger.info("      " + "Frames:");
						for (var frameNumber=0;frameNumber<timeline.frameCount;frameNumber++) {
							var formatValues = SpritesheetCI.frameValues(
								{
									'doc': doc, 
									'timeline': timeline, 
									'frameNumber': frameNumber, 
									'labelsLayer': labelsLayer, 
									'layer': layer
								}
							);
							formatValues.workDir = workDir;
							
							SpritesheetCI.padNumbers(formatValues, options.numberPadding);
							var fileURI = SpritesheetCI.formatString(options.spriteURIFormat, formatValues);
							SpritesheetCI.Path.validateFilePath(fileURI, options.texturePacker['texture-format']);
							
							// export frame!
							timeline.currentFrame = frameNumber;
							if (!options.dryrun) {
								FLfile.createFolder(fileURI.substr(0, fileURI.lastIndexOf("/")));
								doc.exportPNG(fileURI, true, true);
							}
							
							logger.info("        " + frameNumber + ": " + FLfile.uriToPlatformPath(fileURI));
							
							delete formatValues;
							delete fileURI;
							
						}
						delete layer;
						delete frameNumber;
					}
					delete timeline;
					delete labelsLayer;
					delete layers;
					delete layerNumber;
				}
				delete timelines;
				delete t;
				
				if (!options.dryrun) {
					var packer = new TexturePacker(options.texturePacker);
					result = packer.pack({
						'folder': workDir,
						'sheet': sheetURI
					});
					logger.info("Texture Packer:\n" + result.log);
				}
			} 
			catch (error) {
				logger.error(error.message);
				logger.error(error.stack);
			}
			finally {
				doc.close(false);
				logger.info("Closed document.");
				
				var logLevel;
				if (!result || result.images.length == 0) {
					logLevel = logger.WARNING;
				} else {
					logLevel = logger.INFO;
				}
				logger.log((options.texturePacker.multipack ? "Multi-packed" : "Packed") + " " + (result ? result.images.length : 0) + " " + (result && result.images.length == 1 ? "sheet" : "sheets") + ".", logLevel);
				if (result && result.images.length) {
					for (var i=0; i<result.images.length; i++) {
						logger.log("  " + (i+1) + ": " + FLfile.uriToPlatformPath(result.images[i]), logLevel);
					}
					delete i;
				}
				delete logLevel;
				
				var logLevel;
				if (!result || result.tpsheets.length == 0) {
					logLevel = logger.WARNING;
				} else {
					logLevel = logger.INFO;
				}
				logger.log((options.texturePacker.multipack ? "Multi-packed" : "Packed") + " " + (result ? result.tpsheets.length : 0) + " " + (result && result.tpsheets.length == 1 ? "data file" : "data files") + ".", logLevel);
				if (result && result.tpsheets.length) {
					for (var i=0; i<result.tpsheets.length; i++) {
						logger.log("  " + (i+1) + ": " + FLfile.uriToPlatformPath(result.tpsheets[i]), logLevel);
					}
					delete i;
				}
				delete logLevel;
				
				if (FLfile.remove(workDir)) {
					logger.info("Deleted working directory.");
				} else {
					logger.warning("Failed to delete working directory: " + FLfile.uriToPlatformPath(workDir));
				}
				
				
				logger.flush();
			}
			return result;
		},
	};
	
	SpritesheetCI.Exporter = Exporter;

}) (this.SpritesheetCI);
