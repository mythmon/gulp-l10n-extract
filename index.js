var path = require('path');

var acorn = require('acorn');
var acornWalk = require('acorn/util/walk');
var cheerio = require('cheerio');
var es = require('event-stream');
var streamCombiner = require('stream-combiner');
var vinyl = require('vinyl');

var gulpConcat = require('gulp-concat');
var gulpHeader = require('gulp-header');


module.exports = function l10nExtract(domain) {
  var messages = [];
  var cwd;
  var base;

  return es.through(
    function onData(file) {
      cwd = file.cwd;
      base = file.base;

      var match = file.path.match(/\.([^\.]*)$/);
      if (match) {
        var ext = match[1];
        var extractor = extractors[ext];
        if (extractor) {
          messages = messages.concat(extractor(file));
        } else {
          this.emit('error', new Error('gulp-l10n-extract: Unknown file extension: ' + ext));
        }
      }
    },
    function onEnd() {
      var poContents = messages.reduce(function(memo, poFragment) {
        return memo + '\n\n' + poFragment;
      }, poFileHeader);

      this.emit('data', new vinyl({
        contents: new Buffer(poContents),
        cwd: cwd,
        base: base,
        path: path.join(base, domain + '.pot'),
      }));
  });
};

var extractors = {
  'js': extractJs,
  'html': extractHtml,
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

function extractJs(file) {
  return walk(parse(file))
    .filter(filterCalls)
    .map(makePoFragment);

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
           ['_', 'gettext'].indexOf(callExpr.callee.name) !== -1 &&
           callExpr.arguments.length > 0 &&
           callExpr.arguments[0].type === 'Literal';
  }

  function makePoFragment(callExpr) {
    var source = callExpr.loc.source;
    var msg = '"' + callExpr.arguments[0].value + '"';
    var filePath = path.relative(source.cwd, source.path);

    return [
      '#: ' + filePath + ':' + callExpr.loc.start.line,
      'msgid ' + msg,
      'msgstr ""',
    ].join('\n');
  }
}

function extractHtml(file) {
  var $ = cheerio.load(file.contents);
  var elems = $('l10n, [l10n]');
  return [];
};
