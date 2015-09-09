# style-deps #

Traverse the dependency graph of a CSS project using npm-style import
statements, asynchronously. Basically:
[rework-npm](http://github.com/conradz/rework-npm/) meets
[module-deps](http://github.com/substack/module-deps/).

## Usage ##

### `styleDeps(file, [opts], done)` ###

Starting with `file` as the entry file, traverse your project's dependency
tree and come back with a single CSS bundle. Accepts for the following options:

* `compress`: whether to minify the final CSS. Defaults to `false`.
* `debug`: set to `true` to enable CSS sourcemaps. Defaults to `false`.
* `transforms`: transform streams for modifying your CSS before it gets parsed.
* `pipe`: accept streaming input by piping to the stream this function returns.

Returns a text stream which will simply emit the bundle as a single chunk when
complete. This stream will also emit a `file` event for each file included
in the bundle so that you can easily plug `style-deps` and its dependants
into file-watching tools such as
[watchify](http://github.com/substack/watchify).

### Text Transforms ###

Much like browserify transforms, each text transform is a function which takes
the absolute file path and returns a through stream that modifies the file
before it's parsed:

``` javascript
const through = require('through2')
const deps = require('style-deps')

deps(__dirname + '/index.css', { transforms: [ lowerCase ] })
  .pipe(process.stdout)

// Lower-case all of your project's CSS
function lowerCase (file) {
  return through((chunk, enc, next) => {
    this.push(chunk.toString().toLowerCase())
    next()
  })
}
```

### Source Transforms ###

Similar to text transforms, except instead of returning a stream source
transforms should return a function. This function should accept a CSS AST
generated by [css-parse](http://github.com/reworkcss/css-parse), modifying it
to make changes to the stylesheet after being parsed but before importing any
modules.

Using source transforms instead of text transforms is recommended, considering
that in the latter case transforms tend to parse/stringify content repeatedly
resulting in unnecessary overhead.

Each returned source transform function is passed two arguments:

* `style`: the parsed CSS AST to process.
* `next(err, new)`: a callback to be called when complete. You can either
  pass the callback nothing, or provide a `new` replacement value for the
  AST to use in the next modifier.

``` javascript
const shade = require('rework-shade')
const deps = require('style-deps')

deps(__dirname + '/index.css', { transforms: [ modifier ] })
  .pipe(process.stdout)

function modifier (file, style, next) {
  shade()(style)
  next(null, style)
}
```
