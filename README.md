# gulp-l10n-extract

Extracts calls to gettext and similar into .po files.

## Usage

```js
var l10n = require('gulp-l10n-extract');

gulp.task('l10n', function() {
    gulp.src('src/**/*.js')
        .pipe(l10n('domain'))
        .pipe(gulp.dest('locales/en_US/LC_MESSAGES'));
});
```

This will make `locales/en_US/LC_MESSAGES/domain.po`.
