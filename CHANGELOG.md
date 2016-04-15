Fr 15-04-2016
Haskier b-0.6 (revision 1)
- Added notepad + keyboard shortcuts
- Improved `mailbox` application : Can now send emails
- Created Web Engine, support of input fields and links into web pages
- Added `meetexploit` application (`metacl` shell command) + `ac7-certificate-unverif` & `ssh-hack` exploits
- Added `iplink` application
- Added awesome credits when game is finished !
- Added enterprises IT parks and deployment API
- Pico v2.0 : Now using 'micro' editor

*** === Scenario === ***
- Added Mission 02
- Improved (a little) the tutorial

*** === Misc === ***
- `pico` editor don't ask for saving changes if there are no changes
- Improved clipboard management. Added keyboard shortcuts : Ctrl+C, Ctrl+V, Ctrl+D, Ctrl+Shift+D, Ctrl+K, Ctrl+B
- Mailbox API : Can send mail (synchronously !)
- Added loading screen
- Improved in-page styles support
- Added `error` event for HSF.Script
- Full support for `clear` and `exit` commands that was not working properly due to jQuery.terminal catching
- URL parsing now supports port number
- VAMPP : Added VPC directive `HomeFile` (default: `index.xms`) + comments
- Server class doesn't requires an IP anymore, can make anonymous servers
- Added dependencies injection to Server class : now permit to manager users, networks and so more ! (.user(), .network(), .allowSSH()...)
- Go fullscreen with Ctrl+F shortcut
- Added developper's console
- Added HSF "|;" operator
- Improved HSF reading using Math.js parser (e.g. "a.b['c'].d")
- Dynamic DNS adresses (using haskier variables `window.vars`)
- Improved `icefox` application : `-d` option now supports folders
- Improved `help` command : can now display examples for commands
- Added user levels ("system" "admin" "user"/"guest")
- Added servers security levels (0 1 2 3 4 5 ...), using a vulnerability list (['ac7-certificate-unverif']...)

*** === Bug fixes === ***
- MAJOR Fixed bug in Mission 01 that was stopping the game for a particular choice (using of wrong 'end' operator instead of 'endif')
- `pico` editor was creating many terminals on DOM
- todo() is verified just after setting
- HSF scripts are paused until there is (at least) one running command
- whenLogged() command (app argument) was not running the callback if called after game is ready
- [INVISIBLE] HSF.Script.goLine() was placing one line after requested line
- Fixed a bug with Game Over if first input is not expected one ("gameover")
- Fixed a bug with empty folders into /game folder (PHP was retuning an array instead of an object)
- Fixed a bug with `mkdir` command (was using `displayErr()` instead of `display_error()`)

Su 03-04-2016
Haskier b-0.5 (revision 2)
- Added `didactic` command to get informations on game itself
- Added `send_mail` HSF command
- Added `aes` command for files encryption, including random key generation
- Added `tips` and `history` commands
- Added commands history

*** === Scenario === ***
- Added Mission 01
- Added name choice at game's beginning

*** === Misc === ***
- VAMPP now permits to choose the deliver's root directory (default: /webroot) : -r|--root argument
- Fixed a bug with choice() and confirm() : The prompt was recovered after 2 wrong input values
- Full support of startup scripts (/user/init.hss)
- Prevent user from uninstalling native apps (didactic, ssh-hack)
- Improved commands history recall using up and down arrows

*** === Bug fixes === ***
- Fixed (a lot of) bugs with Package Manager that didn't work due to new store's server
- When save is loaded, player is redirected to his last CWD, not user's home directory
- There was some troubles with "Shift + &" combinaison which was not displaying "1" but "&"
- Save's backup weren't done because of new label's format

Fr 01-04-2016
Haskier b-0.4
- Added `mailbox` application (`mail-cli` command) and its relay server
- Dialogs can be passed with the ArrowDown key
- Improved VAMPP  : support of VPC files, including URL Rewriting and forbidden access
- Improved IceFox : use of new DNS norm : DNS files only associate domains names to an IP
- Improved save manager : Added import/export feature
- Added shell scheduler : `every` command
- Reduced save file. At game's beginning : 90 Kb -> 50 Kb -> 18 Kb -> 5 Kb !

*** === Misc === ***
- `pico` editor will ask you if you want to save changes when leaving the editor
- Improved #include directive in HSF parser : now sub-folders files can be included
- Added `setInitialClock`, `launchClock`, `wait_clock` HSF commands
- VAMPP : Remove last empty line
- Applications can now run a function when user is logged in local server
- Added service.js support
- Added JavaScript schedule (`every` function)

*** === Bug fixes === ***
- Fixed a bug with Server.download() : If the request was containing URL query (ex: 'page?param=value') and data field, the result was 'page?param=value?param2=value2'
- Fixed 2 bugs that happens when a corrupted save is found
- Fixed a bug with SSH application that was read `.sys/server.sys` with a relative path

Th 31-03-2016
Haskier b-0.3
- Added `cp`, `mv` ; `edit` command for simple file editing
- Added `pico` application : A simple text editor

*** === Misc === ***
- Increased messages speed
- Added `exec` and `getcmd` arguments for applications' callback
- Files and folders starting by '.' are now considered as hidden in Server.readDir()
- Added Server.copyFile() and Server.moveFile() functions
- Added action `list` in `cpm` which displays all installed applications

*** === Bug fixes === ***
- Fixed a bug with folders import and export : relative path was used instead of absolute path
- Fixed a bug with Server.removeTree() : relative path was used instead of absolute path

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
