

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
	
	function TexturePackerResult () {
		this.options = undefined;
		this.log = "";
		this.tpsheets = [];
		this.images = [];
		this.error = undefined;
		this.success = false;
	};
	
	function TexturePacker (options) {
		this.defaultOptions = extend({}, TexturePacker.prototype.defaultOptions, options);
	};

	TexturePacker.pack = function (options) {
		return new TexturePacker(options).pack(options);
	};

	TexturePacker.prototype = {
		defaultOptions: {
			'exe'				: "file:///C:/Program Files/CodeAndWeb/TexturePacker/bin/TexturePacker.exe",
			'format'			: 'unity-texture2d',
			'texture-format'	: 'png',
			'opt'				: 'RGBA8888',
			'alpha-handling'	: 'ClearTransparentPixels',
			'scale'				: 1,
			'scale-mode'		: 'Smooth',
			'algorithm'			: 'MaxRects',
			'pack-mode'			: 'Fast',
			'trim-mode'			: 'CropKeepPos',
			'max-size'			: 2048,
			'multipack'			: false,
			'sheet'				: undefined,
			'data'				: undefined,
			'folder'			: undefined,
		},

		pack: function (options) {
			
			options = extend({}, this.defaultOptions, options);
			
			var result = new TexturePackerResult ();
			result.options = options;
			
				
			var requiredOptions = ["exe", "format", "texture-format", "folder", "sheet"];
			for (var i = requiredOptions.length - 1; i >= 0; i--) {
				if (options[requiredOptions[i]] !== undefined) {
					requiredOptions.splice(i, 1);
				}
			}
			delete i;
			if (requiredOptions.length > 0) {
				throw new Error("Missing options: " + requiredOptions.join(", ") + ".")
			}
			
			var exe = options.exe;
			delete options.exe;
			exe = FLfile.uriToPlatformPath(exe);
			
			var folder = options.folder;
			delete options.folder;
			// remove slash at the end because TexturePacker doesn't like it.
			folder = /\/|\\/.exec(folder.substr(-1)) != null ? folder.substr(0, folder.length -1) : folder;
			
			var sheet = options.sheet;
			delete options.sheet;
			
			var data = options.data;
			delete options.data;
			
			if (!data) {
				// The tpsheet URI is optional, by default it's based on the sheet's name.
				var sheetExt = sheet.substring(sheet.lastIndexOf(".") + 1, sheet.length);
				data = sheet.replace(new RegExp("\\." + sheetExt + '$'), '.tpsheet');
			}
			
			var stdout = data.replace(/\.tpsheet$/i, '-texturepacker-info.log');
			var stderr = data.replace(/\.tpsheet$/i, '-texturepacker-error.log');

			var args = [];
			for (var key in options) {
				var value = options[key];
				if (value === true || value === false) {
					if (value) { args.push("--"+key.replace('_', '-')); }
					continue;
				}
				args.push("--"+key + " " + options[key]);
			}
			args.push("--sheet \"" + FLfile.uriToPlatformPath(sheet) + "\"");
			args.push("--data \"" + FLfile.uriToPlatformPath(data) + "\"");
			args.push("\"" + FLfile.uriToPlatformPath(folder) + "\"");
			args.push("> \"" + FLfile.uriToPlatformPath(stdout) + "\"");
			args.push("2> \"" + FLfile.uriToPlatformPath(stderr) + "\"");
			
			// construct command string
			var cmd = "\"" + exe + "\"" + " " + args.join(" ");
			
			result.log += cmd;
			result.log += "\r\n";
			
			
			FLfile.runCommandLine('"' + cmd + '"');
			
		
			if (FLfile.exists(stdout)) {
				var info = FLfile.read(stdout);
				result.log += info.replace(/[\s\r\n]*$/gm,"");
				FLfile.remove(stdout);
				
				var regex  = /Writing sprite sheet to (.*)/g;
				var match;
				while (match = regex.exec(info)) {
					result.images.push(FLfile.platformPathToURI(match[1]));
				}
				regex  = /Writing (.*\.tpsheet)/g;
				match = undefined;
				while (match = regex.exec(info)) {
					result.tpsheets.push(FLfile.platformPathToURI(match[1]));
				}
			}
			if (FLfile.exists(stderr)) {
				var err = FLfile.read(stderr).replace(/[\s\r\n]*$/gm,"");
				if (err) {
					result.error = new Error();
					result.log += result.error.message;
				}
				
				FLfile.remove(stderr);
			}
			
			result.success = result.tpsheets.length > 0 && result.error === undefined;
			
			if (result.error) {
				throw result.error;
			}
			return result;
		}
	};
	
	ctx.TexturePacker = TexturePacker;
}) (this);

