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
