// The box and its chapters, in reading order.
import slice from './slice.js';
import extruder from './extruder.js';
import machine from './machine.js';
import motion from './motion.js';
import fail from './fail.js';
import other from './other.js';

export const BOX = { slug: 'printerthreedclear', title: "PrinterThreeDClear" };
export const CHAPTERS = [slice, extruder, machine, motion, fail, other];
