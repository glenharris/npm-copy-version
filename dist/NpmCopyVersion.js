"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const FsExtra = require("fs-extra");
const Minimist = require("minimist");
const Process = require("process");
const Path = require("path");
const assert = require("assert");
const Winston = require("winston");
const logger = Winston.createLogger({
    format: Winston.format.combine(Winston.format.splat(), Winston.format.simple()),
    transports: [new Winston.transports.Console()]
});
logger.level = 'debug';
class NpmCopyVersion {
    constructor(source, destination) {
        this.source = source;
        this.destination = destination;
        this.options = {
            fixVersion: true
        };
        this.sourceFile = Path.resolve(source);
        this.destinationFile = Path.resolve(destination);
        logger.debug("Updating npm package versions from %s to %s", this.sourceFile, this.destinationFile);
    }
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            assert.ok(FsExtra.statSync(this.sourceFile).isFile(), `${this.sourceFile} is not a file`);
            assert.ok(FsExtra.statSync(this.destinationFile).isFile(), `${this.destinationFile} is not a file`);
            const sourceData = yield FsExtra.readJSON(this.sourceFile);
            const destinationData = yield FsExtra.readJSON(this.destinationFile);
            yield this.copyVersions(sourceData, destinationData, 'dependencies');
            yield this.copyVersions(sourceData, destinationData, 'devDependencies');
            const options = {
                spaces: 2
            };
            yield FsExtra.writeJSON(this.destinationFile, destinationData, options);
        });
    }
    copyVersions(sourceData, destinationData, name) {
        return __awaiter(this, void 0, void 0, function* () {
            const source = sourceData[name];
            if (source) {
                let destination = destinationData[name];
                if (!destination) {
                    destination = {};
                    destinationData[name] = destination;
                }
                for (let name of Object.getOwnPropertyNames(source)) {
                    let sourceValue = source[name];
                    if (this.options.fixVersion) {
                        const fixedVersion = sourceValue.replace(/^[^~]/, '');
                        if (fixedVersion !== sourceValue) {
                            logger.warn("Fixing %s version from '%s' to '%s'", name, sourceValue, fixedVersion);
                            sourceValue = fixedVersion;
                        }
                    }
                    const destinationValue = destination[name];
                    if (destinationValue !== undefined) {
                        if (sourceValue !== destinationValue) {
                            destination[name] = sourceValue;
                            logger.info("Updating %s from '%s' to '%s'", name, destinationValue, sourceValue);
                        }
                    }
                    else {
                        logger.debug('Skipping missing dependency %s', name);
                    }
                }
            }
        });
    }
}
const args = Minimist(Process.argv.slice(2));
const source = args._.shift();
const destination = args._.shift() || 'package.json';
if (source && destination) {
    logger.info("Updating npm package versions from %s to %s", source, destination);
    const operation = new NpmCopyVersion(source, destination);
    void operation.execute();
}
else {
    logger.info('Missing source package file');
}
