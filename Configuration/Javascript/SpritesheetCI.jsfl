/********************************************************************************
 * Name: Export .fla to PNGs
 * Description: Wrapper around Flash's extend API, for exporting PNG sequences in different ways
 * Author: Mitch Stoffels
 * License: MIT
 ********************************************************************************/

(function (ctx) {
	
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
	
	function SpritesheetCI () {};
	
	SpritesheetCI.prototype = {
		padNumber: function (n, width, z) {
			z = z || '0';
			width = isNaN(width) ? 2 : width;
			n = n + '';
			return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
		},
		
		padNumbers: function (obj, widths) {
			for (var key in widths) {
				if (!obj.hasOwnProperty(key) || obj[key] === undefined) {
					continue;
				}
				obj[key] = this.padNumber(obj[key], widths[key]);
			}
		},
		
		layers: function (layers, timeline, doc) {
			if (timeline instanceof Document) {
				var t = doc;
				doc = timeline;
				timeline = t;
			}
			
			if (typeof layers === "function") {
				timeline = timeline || (doc || fl.getDocumentDOM()).getTimeline();
				var tlayers = timeline.layers;
				var result = [];
				for (var i = 0; i < tlayers.length; i++) {
					if (layers(tlayers[i], timeline, doc) === true) {
						result.push(tlayers[i]);
					}
				}
				return result;
			} else if (layers instanceof Layer) {
				return [layers];
			}  else if (layers instanceof RegExp) {
				var regex = layers;
				return this.layers(function (layer) {
					return regex.exec(layer.name) !== null;
				}, timeline, doc);
			} else if (typeof layers === "number") {
				timeline = timeline || (doc || fl.getDocumentDOM()).getTimeline();
				var layer = timeline.layers[layers];
				if (layer !== undefined) return [layer];
				else return [];
			} else if (typeof layers === "string") {
				var name = layers;
				return this.layers(function (layer) {
					return layer.name === name;
				}, timeline, doc);
			} else if (Object.prototype.toString.call(layers) == '[object Array]') {
				var result = [];
				for (var i = 0; i < layers.length; i++) {
					var parsed = this.layers(layers[i]);
					for (var j = 0; j < parsed.length; j++) {
						result.push(parsed[j]);
					}
				}
				return result;
			} else {
				throw new Error("Invalid argument 'layers'. Expected a Layer, function, RegExp, number, string or Array, instead of " + (typeof layers) + ".")
			}
		},
		
		layer: function (layer, timeline, doc) {
			var layers = this.layers(layer, timeline, doc);
			if (!layers || layers.length == 0) { return undefined; }
			if (layers.length == 1) { return layers[0]; }
			else { throw new Error("Found multiple layers that match argument 'layer': " + layer.toString() + ". Expected only one match instead of " + layers.length + ".") }
		},
		
		frameLabel: function (frameNumber, labelsLayer) {
			if (isNaN(frameNumber)) { throw new Error("Argument frameNumber must be a number instead of " + (typeof frameNumber) + "."); }
			if (!(labelsLayer instanceof Layer)) { throw new Error("Argument labelsLayer must be a Layer instead of " + (typeof labelsLayer) + "."); }

			if (frameNumber >= labelsLayer.frameCount) {
				return "";
			}
			var frame = labelsLayer.frames[frameNumber];
			return frame.labelType !== "name" ? "" : frame.name;
		},
		
		frameNumberRelativeToLabel: function (frameNumber, labelsLayer) {
			if (isNaN(frameNumber)) { throw new Error("Argument frameNumber must be a number instead of " + (typeof frameNumber) + "."); }
			if (!(labelsLayer instanceof Layer)) { throw new Error("Argument labelsLayer must be a Layer instead of " + (typeof labelsLayer) + "."); }
			var label = this.frameLabel(frameNumber, labelsLayer);
			var nextLabel = label;
			for (var i = frameNumber - 1; i >= 0; i--) {
				nextLabel = this.frameLabel(i, labelsLayer);
				if (label != nextLabel) {
					return frameNumber - i;
				}
			}
			return frameNumber;
		},
		
		frameLabelNumber: function (frameNumber, labelsLayer) {
			if (isNaN(frameNumber)) { throw new Error("Argument frameNumber must be a number instead of " + (typeof frameNumber) + "."); }
			if (!(labelsLayer instanceof Layer)) { throw new Error("Argument labelsLayer must be a Layer instead of " + (typeof labelsLayer) + "."); }
			var labelCount = 0;
			var currentLabel = "";
			for (var i = 0; i < labelsLayer.frameCount; i++) {
				var frame = labelsLayer.frames[i];
				if (frame.labelType !== "name") continue;
				if (frame.name !== currentLabel) {
					currentLabel = frame.name;
					labelCount++;
				}
				if (i == frameNumber) return labelCount;
			}
			return null;
		},
		
		layerChildren: function (layer, timeline) {
			var result = [];
			var layers = timeline.layers;
			for (var i = 0; i<layers.length; i++) {
				if (layers[i].parentLayer == layer) {
					result.push(timeline.layers[i]);
				}
			}
			return result;
		},
		
		layerPath: function (layer, separator) {
			if (!separator) { separator = '/'; }
			if (!(layer instanceof Layer)) { throw new Error("Argument layer should be a Layer instead of " + (typeof layer) + ".") }
			var layerPath = "";
			var childLayer = layer;
			while (childLayer.parentLayer != null && childLayer.parentLayer.layerType == "folder") {
				layerPath = childLayer.parentLayer.name + separator + layerPath;
				childLayer = childLayer.parentLayer;
			}
			if (layerPath.substr(-1) == separator) {
				return layerPath.substring(0, layerPath.length -1);
			}
			else {
				return layerPath;
			}
		},
		
		formatString: function (format_str, values) {
			// replace every ${key} match
			var result = format_str.replace(/\$\{([^\}]+)\}/g, function (str, key) {
				if (!values.hasOwnProperty(key)) return str;
				return values[key];
			});
			return result
				// remove leftover ${key} occurrences
				.replace(/\${.*?}/g, "")
				// replace // with /, and then fix file:///
				.replace(/\/+/g, "/").replace(/^file:\//, "file:///")
				// replace __ with _
				.replace(/_+/g, "_")
				// replace -- with -
				.replace(/-+/g, "-")
				// replace one or more spaces with one space
				.replace(/\s+/g, " ")
				// replace /_ with /
				.replace(/\/_/g, "/")
				// replace /- with /
				.replace(/\/-/g, "/");
		},
		
		frameValues: function (doc, frameNumber, timeline, labelsLayer, layer) {
			if (arguments.length == 1 && typeof arguments[0] === "object") {
				var options = arguments[0];
				doc = options.doc;
				frameNumber = options.frameNumber;
				timeline = options.timeline;
				labelsLayer = options.labelsLayer;
				layer = options.layer;
			}
			if (!(doc instanceof Document)) { throw new Error("Argument doc should be a Document instead of " + (typeof doc) + "."); }
			if (isNaN(frameNumber)) { throw new Error("Argument frameNumber should be a number instead of " + (typeof frameNumber) + "."); }
			if (timeline === undefined) { timeline = doc.getTimeline(); }
			if (!(timeline instanceof Timeline)) { throw new Error("Argument timeline should be a Timeline instead of " + (typeof timeline) + "."); }
			if (labelsLayer !== undefined && !(labelsLayer instanceof Layer)) { throw new Error("Argument labelsLayer should be a Layer or undefined instead of " + (typeof labelsLayer) + "."); }
			if (layer !== undefined && !(layer instanceof Layer)) { throw new Error("Argument layer should be a Layer or undefined instead of " + (typeof layer) + "."); }

			var values = {};

			values.flaFolder = doc.pathURI.substr(0, doc.pathURI.lastIndexOf("/"));
			var filename = doc.pathURI.substr(doc.pathURI.lastIndexOf("/") + 1, doc.pathURI.length);
			values.flaName = filename.substr(0, filename.lastIndexOf("."));
			values.timeline = timeline.name;
			values.frameNumber = Number(frameNumber);

			if (labelsLayer !== undefined) {
				values.frameNumberRelativeToLabel = this.frameNumberRelativeToLabel(frameNumber, labelsLayer);
				values.frameLabel = this.frameLabel(frameNumber, labelsLayer);
				values.frameLabelNumber = this.frameLabelNumber(frameNumber, labelsLayer);
			}
			if (layer !== undefined) {
				values.layerNumber = timeline.layers.indexOf(layer);
				values.layerName = layer.name.replace(/\[[^\]]+\]\s?/g, "");
				values.layerPath = this.layerPath(layer, '/');
				values.layerNumberRelativeToParent = this.layerChildren(layer.parentLayer, timeline).indexOf(layer);
				
				var totalLayers = this.layerChildren(layer.parentLayer, timeline).length;
				values.sortOrder = totalLayers - values.layerNumber;
			}
			return values;
		}
		
		
	};
	
	ctx.SpritesheetCI = new SpritesheetCI();
	
	
	function Path () {};
	
	Path.prototype = {
		
		/**
		 * Accepts one or more sources, 
		 * or arrays of sources.
		 * Sources can be a Document or a file or folder URI. 
		 * 
		 * Returns a flat array of fla file URIs.
		 **/
		parseFlashFiles: function (source) {
			if (arguments.length == 1 && arguments[0] === undefined) {
				throw new Error("Parameter 'source' can't be undefined.");
			}
			if (arguments.length == 0) {
				try {
					source = fl.getDocumentDOM();
				} catch (e) {
					source = null;
				}
				if (source == null) {
					source = this.browseForFlashFile();
				}
				else {
					source = source.pathURI;
				}
				return [source];
			}
			if (arguments.length > 1) {
				return this.parseFlashFiles(Array.prototype.slice.call(arguments));
			}
			var files;
			if (source instanceof Document) {
				files = [source.pathURI];
			}
			else if (this.isValidFilePath(source, 'fla')) {
				return [source];
			}
			else if (this.isValidFolderPath(source)) {
				files = this.getFilesInFolder(source, 'fla');
				if (!files || !files.length) {
					throw new Error("There are no *.fla files in this folder:\n    " + FLfile.uriToPlatformPath(source) +"\n\n");
				}
			}
			else if (Object.prototype.toString.call(source) == '[object Array]') {
				files = [];
				for (var i in source) {
					Array.prototype.push.apply(files, this.parseFlashFiles(source[i]));
				}
			}
			else {
				throw new Error("Invalid source: " + source);
			}
			
			return files;
		},

		browseForPNGFile: function () {
			var file = fl.browseForFileURL("save", "Save the *.png file.", "PNG Image (*.png)", "png");
			if (!file) { throw new Error ("No file selected."); }
			return file;
		},
		
		browseForFlashFile: function () {
			var file = fl.browseForFileURL("open", "Select a *.fla file.", "FLA Document (*.fla)", "fla");
			if (!file) { throw new Error ("No file selected."); }
			return file;
		},
		
		browseForFolder: function () {
			var folder = fl.browseForFolderURL("Select a folder.");
			if (!folder) { throw new Error("No folder selected."); }
			return folder;
		},

		browseForFlashFolder: function () {
			var folder = fl.browseForFolderURL("Select a folder containing *.fla files.");
			if (!folder) { throw new Error("No folder selected."); }
			var fileNames = this.getFilesInFolder(folder, 'fla');
			if (!fileNames || !fileNames.length) { throw new Error("The selected folder doesn't contain any *.fla files."); }
			return folder;
		},

		browseForFlashFiles: function () {
			var folder = fl.browseForFolderURL("Select a folder containing *.fla files.");
			if (!folder) { throw new Error("No folder selected."); }
			var fileNames = SpritesheetCI.Path.getFlashFilesInFolder(folder);
			if (!fileNames || !fileNames.length) { throw new Error("The selected folder doesn't contain any *.fla files."); }
			return fileNames;
		},

		isValidPath: function (str) {
			try {
				this.validatePath(str);
				return true;
			} catch (error) {
				return false;
			}
		},
		
		isValidFilePath: function (str, ext) {
			try {
				this.validateFilePath(str, ext);
				return true;
			} catch (error) {
				return false;
			}
		},
		
		isValidFolderPath: function (str) {
			try {
				this.validateFolderPath(str);
				return true;
			} catch (error) {
				return false;
			}
		},
		
		validatePath: function (str) {
			if (!str) {
				throw new Error("Invalid URI. The URI can't be " + (typeof str).toString() + ".");
			}
			
			if (typeof str !== "string") 
				throw new Error("Invalid URI. The URI must be a string instead of " + (typeof str) + ". " + str.toString());
			
			if (str.indexOf("file:///") != 0) 
				throw new Error("Invalid URI. The URI should start with file:///. Instead it starts with \"" + str.substr(0, 10) + "...\".\n" + str);
			
			if (/([^\/])\.\./.test(str)) {
				throw new Error("Invalid URI. The URI contains an invalid pattern: " + str);
			}
			
			if (/undefined/.test(str)) {
				throw new Error("Invalid URI. The URI contains the phrase 'undefined': " + str);
			}
			
			str = FLfile.uriToPlatformPath(str);
			str = FLfile.platformPathToURI(str);
			
			return str;
			
		},
		
		validateFilePath: function (str, ext) {
			this.validatePath(str);
			var afterLastSlash = str.substr(str.lastIndexOf("/") + 1, str.length);
			if (afterLastSlash.indexOf(".") === -1) {
				throw new Error("Invalid File URI. The URI should end with a file extension. Instead it ends with " + "\"..." + str.substr(str.length - 10, str.length) + "\".");
			}
			if (ext) {
				if (str.substr(str.lastIndexOf(".") + 1, str.length).toUpperCase() !== ext.toUpperCase()) {
					throw new Error("Invalid file URI. The URI should end with ."+ext+". Instead it ends with " + "\"..." + str.substr(str.length - 10, str.length) + "\".");
				}
			}
			return str;
		},

		validateFileExistence: function (str, ext) {
			this.validateFilePath(str, ext);
			if (!FLfile.exists(str)) {
				throw new Error("File " + FLfile.uriToPlatformPath(str) + " does not exist.");
			}
			return str;
		},
		
		validateFolderPath: function (str) {
			this.validatePath(str);
			var afterLastSlash = str.substr(str.lastIndexOf("/") + 1, str.length);
			if (afterLastSlash.indexOf(".") !== -1) {
				throw new Error("Invalid Folder URI. The URI seems to have a file extension: " + FLfile.uriToPlatformPath(str));
			}
			return this.appendSlash(str);
		},
		
		appendSlash: function (str) {
			return (str.substr(-1) == "/") ? str : str + "/";
		},
		
		removeSlash: function (str) {
			return (str.substr(-1) == "/") ? str.substr(0, str.length -1) : str;
		},
		
		combine: function (arg1, arg2) {
			var result = "";
			for (var i = 0; i < arguments.length; i++) {
				if (!result) {
					result = arguments[i];
				}
				else {
					result = this.appendSlash(result) + arguments[i];
				}
			}
			return result;
		},
		
		getFolderPath: function (path) {
			if (!path) throw new Error("Missing argument path.");
			if (path instanceof Document) path = path.pathURI;
			if (path.substring(path.lastIndexOf("/") + 1, path.length).indexOf(".") > -1) {
				path = path.substring(0, path.lastIndexOf("/"));
			}
			return this.appendSlash(path);
		},
		
		getFileName: function (str) {
			if (!str) return "";
			if (str instanceof Document) str = str.pathURI;
			str = str.substring(str.lastIndexOf("/") + 1, str.length);
			return str;
		},
		
		getFilenameWithoutExtension: function (str) {
			if (!str) return "";
			if (str instanceof Document) str = str.pathURI;
			str = str.substring(str.lastIndexOf("/") + 1, str.lastIndexOf("."));
			return str;
		},
		
		getFileExtension: function (str) {
			if (!str) return "";
			if (str instanceof Document) str = str.pathURI;
			return str.substring(str.lastIndexOf(".") + 1, str.length);
		},

		getFilesInFolder: function (folder, extension, filter, select) {
			folder = this.appendSlash(this.validateFolderPath(folder));
			
			// get files in folder
			var fileNames = FLfile.listFolder(folder + "*." + extension, "files");
			for (var i = fileNames.length - 1; i >= 0; i--) {
				// exclude when file name starts with RECOVER
				if (fileNames[i].indexOf("RECOVER") != -1) {
					fileNames.splice(i, 1);
					continue;
				}
				
				fileNames[i] = folder + fileNames[i];
				
				if (filter && typeof filter === "function" && !filter(fileNames[i], i, fileNames)) {
					fileNames.splice(i, 1);
					continue;
				}
				
				if (select && typeof select === "function") {
					fileNames[i] = select(fileNames[i], i, fileNames);
				}
			}
			return fileNames;
		},
	};
	
	ctx.SpritesheetCI.Path = new Path();


	function Logger (fileURI) {
		this.fileURI = fileURI === undefined ? undefined : ctx.SpritesheetCI.Path.validateFilePath(fileURI);
		this.trace = true;
		this.buffer = "";
	};
	
	Logger.prototype = {
		
		ERROR: "ERROR",
		INFO: "INFO",
		WARNING: "WARNING",
		
		log: function (str, level) {
			if (this.buffer.length > 0) {
				this.buffer += "\r\n";
			}
			if (level) {
				str = "[" + level + "] " + str;
			}
			this.buffer += str;
		},
		
		error: function (str) {
			this.log(str, this.ERROR);
		},
		
		info: function (str) {
			this.log(str, this.INFO);
		},
		
		warning: function (str) {
			this.log(str, this.WARNING);
		},
		
		flush: function () {
			if (this.fileURI !== undefined) {
				var folder = this.fileURI.substring(0, this.fileURI.lastIndexOf("/"));
				if (!FLfile.exists(folder) && !FLfile.createFolder(folder)) {
					throw new Error("Failed to create folder for log file at " + FLfile.uriToPlatformPath(folder));
				}
				if (!FLfile.exists(this.fileURI) && !FLfile.write(this.fileURI, "")) {
					throw new Error("Failed to write to log file at " + FLfile.uriToPlatformPath(this.fileURI));
				}

				FLfile.write(this.fileURI, this.buffer + "\r\n", "append");
			}
			if (this.trace) {
				fl.trace(this.buffer + "\r\n");
			}
			this.buffer = "";
		},

		read: function () {
			if (!this.fileURI) { return undefined; }
			return FLfile.read(this.fileURI);
		},

		remove: function () {
			if (!this.fileURI) { return false; }
			return FLfile.remove(this.fileURI);
		}
	};
	
	ctx.SpritesheetCI.getLogger = function (fileURI) {
		return new Logger(fileURI);
	};
	
}) (this);
