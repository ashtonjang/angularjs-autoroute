const chokidar = require('chokidar');
const path = require('path');
const _ = require('lodash');
const { spawn } = require('child_process');

const { writeFileSync } = require('fs');
const glob = require('glob');

// Initialize watcher.

const folder = path.join(__dirname, '../src');

const watcher = chokidar.watch(`${folder}/page`, { persistent: true });

module.exports = () => {
    // Add event listeners.
    watcher
        .on('add', (path) => {
            console.log(`File ${path} has been added`);
            writeRouter();
        })
        .on('change', (path) => console.log(`File ${path} has been changed`))
        .on('unlink', (path) => {
            console.log(`File ${path} has been removed`);
            writeRouter();
        });

    // More possible events.
    watcher
        .on('addDir', (path) => console.log(`Directory ${path} has been added`))
        .on('unlinkDir', (path) => console.log(`Directory ${path} has been removed`))
        .on('error', (error) => console.log(`Watcher error: ${error}`))
        .on('ready', () => {
            console.log('Initial scan complete. Ready for changes');
            writeRouter();
        });
};

async function writeRouter() {
    const js = await getRouter();
    writeFileSync(`${folder}/router.js`, js);
    spawn(`eslint`, ['--fix', `${folder}/router.js`]);
    console.log('createFile');
}

function getRouter() {
    const pageFolder = `${folder}/page`;

    return new Promise((resolve) => {
        glob(`${pageFolder}/**/**`, {}, function (er, files) {
            // console.log('files glob', files);
            const js = getTemplate(
                _.chain(files)
                    .map((file) => file.replace(pageFolder, ''))
                    .filter((file) => file.includes('.js') || file.includes('.html'))
                    .value()
            );
            resolve(js);
        });
    });
}

function getTemplate(items) {
    const newItem = _.reduce(
        items,
        (master, item) => {
            const folder = item.substring(0, item.lastIndexOf('.'));
            const fileName = item.substring(item.lastIndexOf('/') + 1);

            // console.log('folder', folder, fileName);
            master[folder] = master[folder] || { folder };
            if (fileName.includes('.html')) {
                master[folder].html = {
                    key: item,
                    name: `${item.replace(/\//g, '').replace(/\./g, '').replace(/:/g, '')}`,
                };
            } else {
                master[folder].js = {
                    key: item,
                    name: `${item.replace(/\//g, '').replace(/\./g, '').replace(/:/g, '')}`,
                };
            }

            return master;
        },
        {}
    );

    const arrItems = _.filter(Object.values(newItem), (item) => item.js && item.html);

    return `
        ${arrItems
            .map(
                (item) => `
/**
 *  자동으로 추가되는 파일입니다. 수정 금지!!!
 */
import ${item.js.name} from "./page${item.js.key}";
import ${item.html.name} from "./page${item.html.key}";
        `
            )
            .join('\n')}
export default $routeProvider => {
            ${arrItems
                .map(
                    (item) => `
    $routeProvider.when('${item.folder}', {
        template: ${item.html.name},
        controller: ${item.js.name}
    });
                `
                )
                .join('\n')}
            
};
    `;
}