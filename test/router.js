/**
 *  자동으로 추가되는 파일입니다. 수정 금지!!!
 */

import testjs from './pages/test.js';
import testhtml from './pages/test.html';

export default ($routeProvider) => {
    $routeProvider.when('/test', {
        template: testhtml,
        controller: testjs,
    });
};
