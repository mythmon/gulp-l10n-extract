var path = require('path');

var vinyl = require('vinyl');
var acorn = require('acorn');
var acornWalk = require('acorn/util/walk');
var es = require('event-stream');
var streamCombiner = require('stream-combiner');

var gulpConcat = require('gulp-concat');
var gulpHeader = require('gulp-header');


module.exports = function l10nExtract(domain) {
  return es.through(function(file) {
    var poContents = walk(parse(file))
      .filter(filterCalls)
      .map(makePoFragment)
      .reduce(function(memo, poFragment) {
        return memo + '\n\n' + poFragment;
      }, poFileHeader);

    this.emit('data', new vinyl({
      contents: new Buffer(poContents),
      cwd: file.cwd,
      base: file.base,
      path: path.join(file.base, domain + '.po'),
    }));
  });
};

var poFileHeader = [
  'msgid ""',
  'msgstr ""',
  '"Project-Id-Version: PACKAGE VERSION\\n"',
  '"Report-Msgid-Bugs-To: \\n"',
  '"POT-Creation-Date: 2014-07-17 11:58-0700\\n"',
  '"PO-Revision-Date: 2010-11-15 12:28-0700\\n"',
  '"Last-Translator: Automatically generated\\n"',
  '"Language-Team: none\\n"',
  '"Language: \\n"',
  '"MIME-Version: 1.0\\n"',
  '"Content-Type: text/plain; charset=UTF-8\\n"',
  '"Content-Transfer-Encoding: 8bit\\n"',
  '"X-Generator: Translate Toolkit 1.6.0\\n"',
  '"Plural-Forms: nplurals=2; plural=(n != 1);\\n"',
].join('\n');

function parse(file) {
  var code = file.contents.toString();
  var ast = acorn.parse(code, {
    locations: true,
    sourceFile: file,
  });
  return ast;
}

function walk(ast) {
  var self = this;
  var nodes = [];
  acornWalk.simple(ast, {
    CallExpression: function(node) {
      nodes.push(node);
    },
  });
  return nodes;
}

function filterCalls(callExpr) {
  return callExpr.callee.type === 'Identifier' &&
         callExpr.callee.name === '_' &&
         callExpr.arguments.length > 0 &&
         callExpr.arguments[0].type === 'Literal';
}

function makePoFragment(callExpr) {
  var source = callExpr.loc.source;
  var msg = '"' + callExpr.arguments[0].value + '"';
  var filePath = path.relative(source.cwd, source.path);
  var poFragment = '#: ' + filePath + ':' + callExpr.loc.start.line + '\n';
  poFragment += 'msgid ' + msg + '\n';
  poFragment += 'msgstr ' + msg + '\n';
  return poFragment;
}
