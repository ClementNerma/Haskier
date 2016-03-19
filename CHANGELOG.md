Sa 19-03-2016
Haskier a-0.5
- Added asynchrounous functions support for HSF
- Improved HSF's scope
- Now HSF scripts are written in JavaScript instead in Math.js
- Added conditions' support in HSF
- Added labels' support in HSF, can go to a previous instruction
- Can go to every label, repeat current label, go to next label
- Added HSF instructions : `human`, `question`, `choice`, `confirm`, `leave`, `freeze`, `restore`, `setTodoModel`, `todo`, `goto`, `repeat`, `next`, `wait`, `testLocalStorage`
- Synchronous HSF can run asynchronous operations and wait the answer
- Progression is now fully saved
- Added multi-scenaristic files support
- Added commands : `com`, `firewall`

*** === Misc === ***
- format() supports objects calls => '${scope.test.result.approx}'
- Disabled browser's cache for Ajax calls

*** === Bug fixes === ***
- Fixed a bug with command's catcher callback
- Fixed a bug with asynchronous inputs

Fr 18-03-2016
Haskier a-0.4
- Added command `ui` (interface costumization)
- Added command `help` (get help on every command)
- Added commands `write`, `read`, `rm`, `cd`, `ls`, `mkdir`

*** === Misc === ***
- Added regex checker for commands' arguments
- Removed unneeded font : Roboto
- Allowed to display() empty messages
- Added function Server.appendFile()
- Added function Server.touchFile()
- Hidden files are now masked by default in Server.readDir()

*** === Bug fixes === ***
- Fixed a bug with display() function that force human-like display for multiple lines texts

Fr 18-03-2016
Haskier a-0.3
- Full HSF support
- Added user-interaction features and human-like display
- Auto-completion now supports files
- Improved server's search engine (glob), like looking only for files or folders

*** === Misc === ***
- Intelligent auto-completion : does not interact in questions
- Added Server.normalize()

*** === Bug fixes === ***
- Fixed bugs with JS-reserved names in servers' filesystems
- Fixed bug with Server.fileExists() which not detects a file if it's content is an empty string ""

Th 17-03-2016
Haskier a-0.2
- New commands : set, force-save
- Added game loader (com/get-game.run)
- Game can now be saved
- Created server feature, including import/export
- Support of hidden files
- HSF (Haskier Scenario File) are now supported [Math.js 1.7.1 parser]

*** === Bug fixes === ***
- Server was returning bad file length for plain text

Th 17-03-2016
Haskier a-0.1
- Commands are supported
- Support of asynchronous commands
- Commands queue for running many operations
- Arguments checker & parser
- Multi-language translation system
- Full Node.js server
- Commands : echo, clear, name

*** === Misc === ***
- Bug reporter
- Custom fonts
- Auto-completion for command's name
