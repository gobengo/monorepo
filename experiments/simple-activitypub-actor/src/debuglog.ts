import {debuglog} from 'node:util';
import {basename} from 'path';

export default (name: string) => debuglog(basename(name));
