const chokidar = require('chokidar');
const _ = require('lodash');
const { spawn } = require('child_process');

const { writeFileSync } = require('fs');
const glob = require('glob');

// Initialize watcher.

module.exports = ({ src, output }) => {
    const watcher = chokidar.watch(`${src}`, { persistent: true });
    let ready = false;
    // Add event listeners.
    watcher
        .on('add', (path) => {
            console.log(`File ${path} has been added`);
            ready && writeRouter({ src, output });
        })
        .on('change', (path) => console.log(`File ${path} has been changed`))
        .on('unlink', (path) => {
            console.log(`File ${path} has been removed`);
            ready && writeRouter({ src, output });
        });

    // More possible events.
    watcher
        .on('addDir', (path) => console.log(`Directory ${path} has been added`))
        .on('unlinkDir', (path) => console.log(`Directory ${path} has been removed`))
        .on('error', (error) => console.log(`Watcher error: ${error}`))
        .on('ready', () => {
            console.log('Initial scan complete. Ready for changes');
            ready = true;
            writeRouter({ src, output });
        });
};

async function writeRouter({ src, output }) {
    const js = await getRouter({ src, output });
    writeFileSync(`${output}`, js);
    spawn(`eslint`, ['--fix', `${output}`]);
    spawn(`./node_modules/.bin/eslint`, ['--fix', `${output}`]);
    console.log('createFile');
}

function getRouter({ src, output }) {
    const pageFolder = `${src}`;

    const arrSrc = src.split('/');
    const arrOutput = output.split('/');

    const compare = [];
    for (let i = 0; i < arrSrc.length; i++) {
        if (arrSrc[i] === arrOutput[i]) {
            compare.push(arrSrc[i]);
            continue;
        } else {
            break;
        }
    }

    const dir = src.replace(compare.join('/'), '');
    console.log('dir', dir);

    return new Promise((resolve) => {
        glob(`${pageFolder}/**/**`, {}, function (er, files) {
            // console.log('files glob', files);
            const js = getTemplate(
                _.chain(files)
                    .map((file) => file.replace(pageFolder, ''))
                    .filter((file) => file.includes('.js') || file.includes('.html'))
                    .value(),
                dir
            );
            resolve(js);
        });
    });
}

function getTemplate(items, dir) {
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
/**
 *  자동으로 추가되는 파일입니다. 수정 금지!!!
 */
        ${arrItems
            .map(
                (item) => `
import ${item.js.name} from ".${dir}${item.js.key}";
import ${item.html.name} from ".${dir}${item.html.key}";
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
