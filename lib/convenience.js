log = function(msg, throwError) {
	if (loggingEnabled) {
		console.log(msg);
	}
	if (throwError) {
		throw new Error(msg);
	}
}