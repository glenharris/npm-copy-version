import * as FsExtra from 'fs-extra';
import * as Minimist from 'minimist';
import * as Process from 'process';
import * as Path from 'path';
import * as assert from 'assert';
import * as Winston from 'winston';

const logger = Winston.createLogger({
    format: Winston.format.combine(
        Winston.format.splat(),
        Winston.format.simple(),
    ),
    transports: [new Winston.transports.Console()]
});
logger.level = 'debug';


class NpmCopyVersion {
    private sourceFile: string;
    private destinationFile: string;
    private options =  {
        fixVersion: true
    };
    constructor(
        private source: string,
        private destination: string,
    ){
        this.sourceFile = Path.resolve(source);
        this.destinationFile = Path.resolve(destination);   
        logger.debug("Updating npm package versions from %s to %s", this.sourceFile, this.destinationFile);
    }
    public async execute() {
        assert.ok(FsExtra.statSync(this.sourceFile).isFile(), `${this.sourceFile} is not a file`);
        assert.ok(FsExtra.statSync(this.destinationFile).isFile(), `${this.destinationFile} is not a file`);
        const sourceData = await FsExtra.readJSON(this.sourceFile);
        const destinationData = await FsExtra.readJSON(this.destinationFile);
        await this.copyVersions(sourceData, destinationData, 'dependencies');
        await this.copyVersions(sourceData, destinationData, 'devDependencies');
        const options = {
            spaces: 2
        };
        await FsExtra.writeJSON(this.destinationFile, destinationData, options);
    }
    private async copyVersions( sourceData: any, destinationData: any, name: string){
        const source = sourceData[name];
        if ( source){
            let destination = destinationData[name];
            if ( !destination){
                destination = {};
                destinationData[name] = destination;
            }
            for ( let name of Object.getOwnPropertyNames(source)) {
                let sourceValue = source[name];
                if ( this.options.fixVersion ){
                    const fixedVersion = sourceValue.replace(/^[^~]/,'');
                    if ( fixedVersion !== sourceValue){
                        logger.warn("Fixing %s version from '%s' to '%s'", name, sourceValue, fixedVersion);
                        sourceValue = fixedVersion;
                    }
                }
                const destinationValue = destination[name];
                if ( destinationValue !== undefined){
                    if ( sourceValue !== destinationValue){
                        destination[name] = sourceValue;
                        logger.info("Updating %s from '%s' to '%s'", name, destinationValue, sourceValue);
                    }
                } else {
                    logger.debug('Skipping missing dependency %s', name);
                }
            }
        }
    }
}
const args = Minimist(Process.argv.slice(2))

const source = args._.shift();
const destination = args._.shift() || 'package.json';
if ( source  && destination ){
    logger.info("Updating npm package versions from %s to %s", source, destination);
    const operation = new NpmCopyVersion(source, destination);
    void operation.execute();
} else {
    logger.info('Missing source package file');
}

