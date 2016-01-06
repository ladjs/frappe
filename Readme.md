
![Frappe][frappe-logo]

# Frappé

[![MIT License][license-image]][license-url]

> Remotely shake your Android devices (including emulators) using a menubar applet and the hotkey `cmd+shift+r`.

![Demo][demo]


## Download

The latest release can be found on the [release page][release-page].


## Support

If you have questions or find a bug, please report it under [Issues][issues].

Donations are appreciated and will support free and open source projects.

Instead of requiring you to pay to unlock typical (and annoying) "license expired" pop-ups and making this only available through the Mac App Store -- I made it free; so please donate!

**[Donate Now][donate-now]**


## Background

Frappé binds the OS X shortcut `cmd+shift+r` to shake all of your connected Android devices over `adb`.

It's a replacement for something like `adb shell input keyevent 82`.

Due bugs in OS X, you cannot create a custom AppleScript command to do this and bind it with Keyboard Shortcuts.

More importantly, Frappé will shake all your devices for you accurately using `adb` directly (e.g. no more typing `-s device-id`)!


## Endpoints

* `/api/crash-reporter` - sends me a crash report in case you run into issues (uses Electron's crashReporter)
* `/api/updates?version=x.x.x` - checks for updates released here on GitHub (uses Electron's Squirrel implementation)


## Contributors

* Nick Baugh <niftylettuce@gmail.com>


## Credits

* [Coffee drink][coffee-drink] by eivven from the Noun Project
* [Earthquake][earthquake] by Mauro Lucchesi from the Noun Project
* [Café Frappé][cafe-frappe] colour palette from Colour Lovers


## License

[MIT][license-url]


[donate-now]: https://goo.gl/I1JFTX
[issues]: https://github.com/niftylettuce/issues
[release-page]: https://github.com/niftylettuce/frappe/releases
[cafe-frappe]: http://www.colourlovers.com/palette/157431/Caf%C3%A9_Frapp%C3%A9
[coffee-drink]: https://thenounproject.com/term/coffee-drink/291679
[earthquake]: https://thenounproject.com/term/earthquake/21862
[license-image]: http://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: LICENSE
[frappe-logo]: https://cdn.rawgit.com/niftylettuce/frappe/master/media/logo.svg
[demo]: https://cdn.rawgit.com/niftylettuce/frappe/master/media/demo.gif
