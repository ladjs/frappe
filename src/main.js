
import Promise from 'prfun';

import {
  crashReporter,
  dialog,
  autoUpdater,
  shell,
  Tray,
  Menu,
  app,
  globalShortcut
} from 'electron';

import adb from 'adbkit';
import path from 'path';
import util from 'util';

// https://goo.gl/yFULSQ
crashReporter.start({
  productName: 'Frappe',
  companyName: 'Niftylettuce LLC',
  submitURL: 'https://getfrappe.com/api/crash-reporter',
  autoSubmit: true
});

const fourHours = 1000 * 60 * 60 * 4
const mediaPath = path.join(__dirname, '..', 'media');
const iconPath = path.join(mediaPath, 'IconTemplate.png');
const iconPathPressed = path.join(mediaPath, 'IconTemplatePressed.png');
const iconPathPressedShaken = path.join(
  mediaPath, 'IconTemplatePressedShaken.png'
);

const client = adb.createClient();
const shortcut = 'cmd+shift+r';
const version = require('../package.json').version;
const feedURL = 'https://getfrappe.com/api/updates?version=' + version;
const versionStr = `Frappe v${version} by @niftylettuce`;

// https://donorbox.org/frappe
const donorBoxURL = 'https://goo.gl/s7T8vl';

// https://github.com/niftylettuce/frappe
const gitHubURL = 'https://goo.gl/T9VSm8';

let deviceIds = [];
let updateState = 'Already up to date';
let tray;

// hide dock icon since we're just menubar
app.dock.hide();

if (process.env.NODE_ENV !== 'development') {

  autoUpdater.setFeedURL(feedURL);

  autoUpdater.on('error', (event, message) => {
    dialog.showMessageBox({
      type: 'warning',
      buttons: [ 'OK' ],
      icon: iconPathPressed,
      message: 'There was an error checking for updates',
      title: 'Update Error',
      detail: message
    });
  });

  autoUpdater.on('checking-for-update', () => {
    // 'Checking for updates...'
    updateState = 'checking-for-update';
  });

  autoUpdater.on('update-not-available', () => {
    // 'Already up to date';
    updateState = 'update-not-available';
  });

  autoUpdater.on('update-available', () => {
    // 'Update available';
    updateState = 'update-available';
  });

  autoUpdater.on(
    'update-downloaded',
    (event, releaseNotes, releaseName, releaseDate, updateURL) => {
      // `Install version ${releaseName} now`;
      updateState = 'update-downloaded';
      autoUpdater.quitAndInstall();
    }
  );

  // check every four hours
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, fourHours);

}

app.on('ready', () => {

  // Create a sweet tray icon
  tray = new Tray(iconPath);
  tray.setToolTip(versionStr);

  let contextMenu = Menu.buildFromTemplate(template());
  tray.setContextMenu(contextMenu);
  tray.setImage(iconPath);

  // Register a 'ctrl+x' shortcut listener.
  let ret = globalShortcut.register(shortcut, () => {
    shake();
  });

  if (!ret || !globalShortcut.isRegistered(shortcut))
    throw new Error('Shortcut was not registered successfully')

  // List devices on start
  listDevices();

  // Track devices
  trackDevices();

});

function trackDevices() {
  client.trackDevices()
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

function template() {

  let submenu = [];

  if (deviceIds.length === 0) {
    submenu.push({
      label: 'No devices connected',
      role: 'help',
      enabled: false
    });
  } else {
    submenu.push({
      label: 'All',
      click: shake,
      accelerator: 'cmd+shift+r'
    });
    deviceIds.forEach(deviceId => {
      submenu.push({
        label: deviceId,
        click() {
          shake(deviceId);
        }
      });
    });
  }

  let menu = [
    {
      label: versionStr,
      role: 'help',
      enabled: false
    },
    {
      type: 'separator'
    },
    {
      label: 'Shake devices',
      submenu: submenu
    },
    {
      label: 'Refresh devices',
      accelerator: 'cmd+r',
      click: listDevices
    },
    {
      type: 'separator'
    },
    {
      label: 'Donate with Stripe or PayPal...',
      accelerator: 'cmd+d',
      click() {
        shell.openExternal(donorBoxURL);
      }
    },
    {
      label: 'View on GitHub...',
      accelerator: 'cmd+v',
      click() {
        shell.openExternal(gitHubURL);
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit Frappe',
      accelerator: 'cmd+q',
      click() {
        app.quit();
      }
    }
  ];

  return menu;

}

app.on('will-quit', function() {

  // Unregister a shortcut.
  globalShortcut.unregister('ctrl+x');

  // Unregister all shortcuts.
  globalShortcut.unregisterAll();

});

function listDevices() {
  client.listDevices()
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
  let contextMenu = Menu.buildFromTemplate(template());
  if (deviceIds.length === 0)
    tray.setImage(iconPath);
  else
    tray.setImage(iconPathPressed);
  tray.setContextMenu(contextMenu);
}

function shake(deviceId) {

  let selectedDeviceIds = deviceIds;

  if (typeof deviceId === 'string')
    selectedDeviceIds = [ deviceId ];

  tray.setImage(iconPathPressedShaken);
  setTimeout(() => {
    tray.setImage(iconPathPressed);
  }, 150);
  setTimeout(() => {
    tray.setImage(iconPathPressedShaken);
  }, 300);
  setTimeout(() => {
    tray.setImage(iconPathPressed);
  }, 450);

  Promise.map(selectedDeviceIds, id => {
    return client.shell(id, 'input keyevent 82')
      .then(adb.util.readAll)
  }).catch(err => {
    dialog.showMessageBox({
      type: 'warning',
      buttons: [ 'OK' ],
      icon: iconPathPressed,
      message: util.format(
        'There was an error sending the shake command to %s',
        selectedDeviceIds.join(', '),
      ),
      title: 'Shake Error',
      detail: err.message || err
    });
  });

}
