'use strict';

import actionOpenMap from '../actions/actionOpenMap.mjs';
import actionLogIn from '../actions/actionLogIn.mjs';
import actionFinish from '../actions/actionFinish.mjs';
import { clickBy, waitBy } from '../lib.mjs';
import { By } from 'selenium-webdriver';

export default async function test() {
    await actionOpenMap();
    await actionLogIn();
    await actionFinish();
}
