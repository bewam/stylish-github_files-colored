#!/usr/bin/env nodejs

var fs = require('fs');
var https = require('https');
var url = require('url');
var util = require('util');
var path = require('path');

var promise = require('promise');
var yaml = require('js-yaml');

/**/
console.log = function () {}; /**/

const settings = {
    forceFresh: false,
    buildSwatches: false,
    /* creates a swatches folder to see results */
    swatches: 'test_swatches',
    swatchName: 'testFile',
    templatesDir: 'templates',
    outputFile: {
        name: 'stylish-github_files-colored.css',
        header: "header.css.tmpl",
        bottom: "footer.css.tmpl",
        extensionRule: '.js-directory-link[title$=\'%s\']',
    },
    showDate: true,
};

var languages = {
    localFile: "languages.yml",
    remoteFile: 'https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml'
};
const fileHeader = "head.css.tmpl";


needDownload(languages.localFile).then(function (successMessage) {
    console.log(successMessage);
    download(languages.remoteFile, languages.localFile).then(function (
        successMessage) {
        console.log('yeah ! ' + successMessage);
        readAndDump(languages.localFile, settings.outputFile.name);
    }, function (err) {
        console.error(err);
        process.exit();
    });
}, function (err) {
    console.log(err);
    readAndDump(languages.localFile, settings.outputFile.name);
});

function readAndDump(fileLanguages, fileCss) {
    console.log('readAndDump');
    var languages = yaml.safeLoad(fs.readFileSync(fileLanguages, 'utf8'));
    var o = '',
        dirOk = false,
        fileName = '',
        k, l, language, err;

    if(settings.showDate) {
        o += '/* ';
        o += (new Date()).toGMTString();
        o += " */\n";
    }

    o += getCssHead();

    if(settings.buildSwatches) {

        /** NOTE: directory does'nt exist,
         * if no error thrown when file is created
         * we grab the true for false.
         */
        try {

            dirOk = not(!!fs.mkdirSync(settings.swatches));
        }
        catch(err) {
            if(err.code === 'EEXIST') {
                dirOk = true;
            }
        }
        console.log('dirOk: ' + dirOk);
    }


    for(k of Object.keys(languages)) {
        language = languages[k];
        language.name = k;

        if(language.color) {
            o += "\n";
            o += '/**- ';
            o += language.name;
            o += '-*/';
            o += "\n";

            if(language.extensions) {
                for(var ext of language.extensions) {

                    if(settings.buildSwatches && dirOk) {
                        fileName = [
                             settings.swatches,
                             settings.swatchName + ext
                            ].join(path.sep);

                        fs.writeFileSync(fileName, '');
                    }

                    o += buildRule(ext);
                    o += '{border-color:' + language.color + ';}';
                    o += "\n";
                }
            }
        }
        else {
            console.log(
                util.format(
                    "no color:%s (%s)",
                    language.name,
                    language.type)
            );
        }
    }
    o += getCssBottom();
    fs.writeFile(fileCss, o);
}

function needDownload(file) {
    var pro = new promise(function (resolve, reject) {
        if(settings.forceFresh) {
            resolve('download forced');
        }
        else {
            try {
                /**
                 * Am I too stupid to believe fs.exists will be obsolete ?
                 */
                fs.open(file, 'r', function (err, fd) {
                    if(!err) {
                        reject(new Error('file exists'));
                        fs.close(fd);
                    }
                    else {
                        resolve('file not present');
                    }

                });

                if(fileIsNotEmpty(file)) {
                    reject(new Error('file not empty'));
                }
                else {
                    resolve('file not present or empty');
                }

            }
            catch(e) {}
            finally {
                return pro;
            }
        }
    });
    return pro;
}

function not(boolean) {
    return(!boolean);
}

function getTemplateURI(file) {
    return [settings.templatesDir, file].join(path.sep);
}

function getCssHead() {
    var content = '{';
    try {
        content = fs.readFileSync(getTemplateURI(settings.outputFile.header),
            'utf8');
    }
    catch(e) {}
    finally {
        return content;
    }
}

function getCssBottom() {
    var content = '}';
    try {
        content = fs.readFileSync(getTemplateURI(settings.outputFile.bottom),
            'utf8');
    }
    catch(e) {}
    finally {
        return content;
    }

}

function fileIsNotEmpty(file) {
    var size = 0;
    try {
        size = fs.statSync(file).size;
    }
    finally {
        return size > 0;
    }
}

function download(remoteFile, localFile) {

    var file = fs.createWriteStream(localFile);

    var pro = new promise(function (resolve, reject) {
        https.get(url.parse(remoteFile), function (response) {

            response.on('data', function (chunk) {
                file.write(chunk);
            }).on('error', function (err) {
                reject(err);
            }).on('end', function () {
                file.end();

                if(fileIsNotEmpty(localFile)) {
                    resolve('download succeed');
                }
                else {
                    reject(
                        'download failed, file empty'
                    );
                }
            });
        });
    });
    return pro;
}

function buildRule(str) {
    return util.format(settings.outputFile.extensionRule, str);
}
