import Promise from 'prfun';

import {
    dialog,
    shell,
    Tray,
    Menu,
    app,
    globalShortcut
} from 'electron';

import adb from 'adbkit';
import path from 'path';
import util from 'util';

const mediaPath = path.join(__dirname, '..', 'media');
const iconPath = path.join(mediaPath, 'IconTemplate.png');
const iconPathPressed = path.join(mediaPath, 'IconPressedTemplate.png');

const client = adb.createClient();
const version = require('../package.json').version;
const versionStr = `Frappé v${version} by @niftylettuce && @alwx`;
const gitHubURL = 'https://github.com/niftylettuce/frappe';

const commands = {
    shake:      {shortcut: 'ctrl+shift+s',
                 operations: ['input keyevent 82']},
    reloadJs:   {shortcut: 'ctrl+shift+r',
                 operations: ['input keyevent 82',
                              'input keyevent 19',
                              'input keyevent 23']},
    debugJs:    {shortcut: 'ctrl+shift+d',
                 operations: ['input keyevent 82',
                              'input keyevent 19',
                              'input keyevent 20',
                              'input keyevent 23']},
    liveReload: {shortcut: 'ctrl+shift+e',
                 operations: ['input keyevent 82',
                              'input keyevent 19',
                              'input keyevent 20',
                              'input keyevent 20',
                              'input keyevent 23']}
};

// OSX specific initialization
if (process.platform === 'darwin') {
    // dock api only on osx
    app.dock.hide();

    commands.shake.shortcut = "cmd+shift+s";
    commands.reloadJs.shortcut = "cmd+shift+r";
    commands.debugJs.shortcut = "ctrl+shift+d";
    commands.liveReload.shortcut = "cmd+ctrl+shift+e";
}


let deviceIds = [];
let tray;
app.on('ready', () => {
    // Create a sweet tray icon
    tray = new Tray(iconPath);
    tray.setToolTip(versionStr);

    let contextMenu = Menu.buildFromTemplate(menuTemplate());
    tray.setContextMenu(contextMenu);
    tray.setImage(iconPath);

    Object.keys(commands).forEach(function(commandKey) {
        globalShortcut.register(commands[commandKey].shortcut, () => {
            deviceCall(0, commands[commandKey].operations);
        });
    });

    // List devices on start
    listDevices();

    // Track devices
    trackDevices();
});

app.on('will-quit', function() {
    globalShortcut.unregisterAll();
});

function trackDevices() {
    client
    .trackDevices()
    .then(function(tracker) {
        tracker.on('add', function(device) {
            if (deviceIds.indexOf(device.id) === -1) {
                deviceIds.push(device.id);
                refreshDevices();
            }
        })
        tracker.on('remove', function(device) {
            let index = deviceIds.indexOf(device.id);
            if (index !== -1) {
                deviceIds.splice(index, 1);
                refreshDevices();
            }
        })
    })
    .catch(function(err) {
        dialog.showMessageBox({
            type: 'warning',
            buttons: [ 'OK' ],
            icon: iconPathPressed,
            message: 'There was an error tracking the devices',
            title: 'Tracking Error',
            detail: err.message || err
        });
    })
}

function getDeviceSubmenu(deviceId, hasAccelerator) {
    return [
        {
            label: 'Shake',
            click: function() {
                deviceCall(deviceId, commands.shake.operations)
            },
            accelerator: hasAccelerator ? commands.shake.shortcut : ''
        },
        {
            type: 'separator'
        },
        {
            label: 'Reload JS',
            click: function() {
                deviceCall(deviceId, commands.reloadJs.operations)
            },
            accelerator: hasAccelerator ? commands.reloadJs.shortcut : ''
        },
        {
            label: 'Start/stop debugging',
            click: function() {
                deviceCall(deviceId, commands.debugJs.operations)
            },
            accelerator: hasAccelerator ? commands.debugJs.shortcut : ''
        },
        {
            label: 'Enable/disable Live Reload',
            click: function() {
                deviceCall(deviceId, commands.liveReload.operations)
            },
            accelerator: hasAccelerator ? commands.liveReload.shortcut : ''
        }
    ];
}

function menuTemplate() {
    let menu = [
        {
            label: versionStr,
            role: 'help',
            enabled: false
        },
        {
            type: 'separator'
        }
    ];

    if (deviceIds.length === 0) {
        menu.push({
            label: 'No devices connected',
            role: 'help',
            enabled: false
        });
    } else {
        menu.push({
            label: 'All devices',
            submenu: getDeviceSubmenu(0, true)
        });
        deviceIds.forEach(deviceId => {
            menu.push({
            label: deviceId,
            submenu: getDeviceSubmenu(deviceId, false)
            });
        });
    }

    menu.push(
        {
            label: 'Refresh devices',
            click: listDevices
        },
        {
            type: 'separator'
        },
        {
            label: 'View on GitHub...',
            click() {
                shell.openExternal(gitHubURL);
            }
        },
        {
            type: 'separator'
        },
        {
            label: 'Quit',
            click() {
                app.quit();
            }
        }
    );

    return menu;
}

function listDevices() {
    client
    .listDevices()
    .then(devices => {
        deviceIds = devices.map(device => {
            return device.id;
        });
    })
    .then(refreshDevices)
    .catch(err => {
            dialog.showMessageBox({
            type: 'warning',
            buttons: [ 'OK' ],
            icon: iconPathPressed,
            message: 'There was an error refreshing the devices',
            title: 'Refresh Error',
            detail: err.message || err
        });
    });
}

function refreshDevices() {
    let contextMenu = Menu.buildFromTemplate(menuTemplate());
    tray.setContextMenu(contextMenu);
    if (deviceIds.length === 0) {
        tray.setImage(iconPath);
    } else {
        tray.setImage(iconPathPressed);
    }
}

function deviceCallChain(id, commands, finally_fn) {
    let shellCommand = client.shell(id, commands[0]);

    if (commands.length > 1) {
        return shellCommand.then(() => {
            setTimeout(() => {
                deviceCallChain(id, commands.slice(1), finally_fn);
            }, 500)
        });
    } else {
        return shellCommand.then(finally_fn);
    }
}

const deviceCall = (deviceId, commands) => setImmediate(() => {
    let selectedDeviceIds = deviceIds;

    if (typeof deviceId === 'string') {
        selectedDeviceIds = [deviceId];
    }

    Promise.map(selectedDeviceIds, id => {
        return deviceCallChain(id, commands, adb.util.readAll);
    }).catch(err => {
        dialog.showMessageBox({
            type: 'warning',
            buttons: [ 'OK' ],
            icon: iconPathPressed,
            message: util.format(
                'There was an error sending the command to %s',
                selectedDeviceIds.join(', '),
            ),
            title: 'Shake Error',
            detail: err.message || err
        });
    });
});
