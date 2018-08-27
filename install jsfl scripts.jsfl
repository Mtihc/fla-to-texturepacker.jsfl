(function () {
	
	fl.trace("Copying jsfl scripts" + " to \""+FLfile.uriToPlatformPath(fl.configURI)+"\":");
	
	install(
		"Javascript/TexturePacker.jsfl",
		"Javascript/SpritesheetCI.jsfl",
		"Javascript/SpritesheetCI.Exporter.jsfl",
		"Commands/Export with TexturePacker.jsfl"
	);

	function install () {
		var errors = [];
		var infos = [];
	
		for (var i = 0; i < arguments.length; i++) {
			var path = arguments[i];
			try {
				if (/^(?:Commands|Javascript)\/.*/.exec(path) === null) {
					throw new Error("Can't install \""+FLfile.uriToPlatformPath(path)+"\". Paths should start with \"Javascript\/\" or \"Commands\/\".");
				}
				var from = fl.scriptURI.substr(0, fl.scriptURI.lastIndexOf("/")) + "/Configuration/" + path;
				var to = fl.configURI + path;
				if (FLfile.exists(to)) {
					if (FLfile.getModificationDate(to) > FLfile.getModificationDate(to)) {
						infos.push("Newer version of '"+path+"' already installed at '" + FLfile.uriToPlatformPath(to) + "'.");
						continue;
					}
				}
				var toDir = to.substr(0, to.lastIndexOf("/"));
				if (FLfile.createFolder(toDir)) {
					infos.push("Created directory " + FLfile.uriToPlatformPath(toDir))
				}
				FLfile.remove(to);
				if (!FLfile.copy(from, to)) {
					throw new Error("Failed to copy " + FLfile.uriToPlatformPath(from) + " to " + FLfile.uriToPlatformPath(to) + ".")
				}
				infos.push("Copied " + path)
			} catch (e) {
				errors.push(e.message);
				infos.push(e.message);
			}
		}
		
		fl.trace(" - " + infos.join("\n - "));
		if (errors.length) {
			var message = " - " + errors.join("\n - ");
			fl.trace(message);
			alert(message);
			return false;
		}
		return true;
	}
	
}) ();
