We 30-03-2016
Haskier b-0.2
- NEW : Mission 01
- Haskier can now run with Apache+PHP or Node.js
- Scripts can now be runned without their extension if they are in the `/env` directory or in the current folder
- Improved tokens support
- Added server's securities support
- Added the Shaun's hacking tool

*** === Misc === ***
- Many commands can be typed in the same line, using the '&&' operator
- Added HSF commands `incoming`, `incomingEnd`, `download`, `taken` and `exec`
- Improved translations loading speed
- Removed `@model` server from save

*** === Bug fixes === ***
- Fixed a bug with commands starting by a space (' echo Hi !' was causing an error)
- Fixed a bug : When come back to the game, trying to connect to the wrong server
- Fixed 2 bugs with flux redirections ('>' and '<' operators)
- Fixed a bug : When come back to the game and save go to a sub-root folder (ex: /apps), the path was causing an error because the system was reading '.sys/server.sys' as a relative path => /apps/.sys/server.sys
- Fixed a bug with multiple-lines shell scripts

Fr 25-03-2016
Haskier b-0.1
- Added web page's in-scripts support
- Added web page's style support (disabled by default)
- Output '>' operator now supports variable (echo Hi ! > $message)
- Variables can be used as commands
- Added `ssh` application
- Added `shell`, `sleep`, `ssh-back` and `ssh-home` commands
- Added multi-server connections support
- Added multi-user per server support
- Added user token to define access

*** === Misc === ***
- Custom prompt are now available
- Improved save manager
- Added Server.randomString() and Server.randomPassword()

*** === Bug fixes === ***
- MAJOR Fixed bugs with normalize() function and a lot of Server functions using a path that didn't work with relative paths
- Fixed bug with `ls` command which was formatting the file's list
- Fixed bug with `rm` command which didn't remove non-empty folders
- Fixed bug with question() function which didn't format the message
- Fixed bug with formatDate() function which was causing a fatal JavaScript error
- Fixed bugs (a lot) with `save` shell command (save manager)

We 23-03-2016
Haskier a-0.7
- Added multi-parts transfers
- Added networks bandwidth
- Improved auto-completion feature (smart arguments, no new line...)
- Disabled auto-save backup for each label, now auto-save only on checkpoints
- Game can now be won or lost => Added `gameWon` and `gameOver` HSF commands
- Added shell filters feature
- Added filters : `with`
- Created new command-line parser, because jQuery.terminal's one didn't support escaping \\ char and was parsing regex
- Added redirection flux ('>' operator for output, '<' operator for input)
- Added `cpm` tool (CenturyCode Package Manager)

*** === Misc === ***
- Added `tree` command
- Added data attachment for HSF labels
- Added game clock (top right corner), including locale formatting
- Removed fullscreen trigger button
- Improved `ui` command
- Added `restart` command which restart the game (reload the web page)
- Added Server.download() function
- Improved VAMPP and IceFox applications

*** === Bug fixes === ***
- MAJOR Fixed bug : When page is refreshed two times without typing any command, progression is lost
- Fixed bug with `label` event in HSF Parser
- Fixed bug with translation which doesn't allow unknown variables
- Fixed bug with `clear` command which was not runned when this command was typed on the terminal
- Fixed bug with the `report_bug()` function which didn't work
- Fixed bug with Server.request.end() which was sending an Infinity of packages when the content size was zero bytes

Su 20-03-2016
Haskier a-0.6
- Added multi-servers support
- Added multi-backups support
- Added custom apps support
- Added installable commands support
- Added events for servers
- Added `response` classe for servers' requests
- Added networks support
- Servers can run a HSS (Haskier Shell Script) at startup (needed for VAMPP)

*** === Misc === ***
- Added Server.importJSON  () function
- Added Server.exportJSON  () function
- Added Server.importFolder() function
- Added Server.exportFolder() function
- Added Server.generateId  () function
- Added Server.id          () function
- Improved prompt for HSF

*** === Bug fixes === ***
- Fixed a bug with HSF.Script.getLabelMarker() which was moving current line
- Fixed a bug with commands because clone() function didn't work correctly with Arrays
- Fixed a bug with Server.removeTree() which didn't remove entries from files table

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
