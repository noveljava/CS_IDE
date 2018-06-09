var parent = function() {
  var spawn = require('child_process').spawn;
  var child = spawn(process.execPath, [process.argv[1], 123]);
  var stdout = '';
  var stderr = '';
  child.stdout.on('data', function(buf) {
    console.log('[STR] stdout "%s"', String(buf));
    stdout += buf;
  });
  child.stderr.on('data', function(buf) {
    console.log('[STR] stderr "%s"', String(buf));
    stderr += buf;
  });
  child.on('close', function(code) {
    console.log('[END] code', code);
    console.log('[END] stdout "%s"', stdout);
    console.log('[END] stderr "%s"', stderr);
  });
};
 
var child = function() {
  var code = Number(process.argv[2]);
 
  process.stdout.write('stdout');
  process.stderr.write('stderr');
 
  exit(code);
};
 
// This appears to fix the problem:
// https://gist.github.com/3427357
function exit(exitCode) {
  if (process.stdout._pendingWriteReqs || process.stderr._pendingWriteReqs) {
    process.nextTick(function() {
      exit(exitCode);
    });
  } else {
    process.exit(exitCode);
  }
}
 
if (process.argv[2]) {
  child();
} else {
  parent();
}