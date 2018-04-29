#!/usr/bin/env nodejs

const fs = require('fs');
const https = require('https');
const url = require('url');
const util = require('util');
const path = require('path');

const promise = require('promise');
const yaml = require('js-yaml');
const compare = require('filecompare');
/**/
console.log = function () {}; /**/

const settings = {
    forceFresh: false,
    noDownload: false,
    buildSwatches: false,
    /* creates a swatches folder to see results */
    swatches: 'test_swatches',
    swatchName: 'testFile',
    templatesDir: 'templates',
    outputFile: {
        name: 'stylish-github_files-colored.css',
        header: "header.css.tmpl",
        bottom: "footer.css.tmpl",
        extensionRule: '.js-navigation-open[title$=\'%s\']',
    },
    showDate: true,
};

var languageFiles = {
    remote: 'https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml',
    local: "languages.yml",
    temp: "temp_languages.yml"
};
const fileHeader = "head.css.tmpl";

if(!settings.noDownload) {
    download(languageFiles.remote, languageFiles.temp)
        .then(function (successMessage) {

            console.log('yeah ! ', successMessage);

            var writeCss = false;

            if(!fs.existsSync(languageFiles.local)) {
                console.log("languages file is new");
                fs.renameSync(languageFiles.temp, languageFiles.local);
                writeCss = true;
            } else {
                console.log("comparing downloaded file with the old one");
                compare(languageFiles.temp, languageFiles.local, (equal) => {
                        console.log('files are different');
                        replaceLocalFile();
                        writeCss = true;
                });
            }

            if(writeCss || settings.forceFresh) {
                readAndDump(languageFiles.local, settings.outputFile.name);

            } else {
                        removeTemporyFile();
            }
        });
} else {
    readAndDump(languageFiles.local, settings.outputFile.name);
}

function readAndDump(fileLanguages, fileCss) {
    var languages = yaml.safeLoad(fs.readFileSync(fileLanguages, 'utf8'));
    var o = '',
        dirOk = false,
        fileName = '',
        k, lang, language, err,
        groups = {};

    if(settings.showDate) {
        o += '/* ';
        o += (new Date())
            .toGMTString();
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
        } catch(err) {
            if(err.code === 'EEXIST') {
                dirOk = true;
            }
        }
        console.log('dirOk: ' + dirOk);
    }

    for(k of Object.keys(languages)) {
        language = languages[k];

        if(language.color) {

            if(!!!groups[k]) {
                groups[k] = {};
            }
            groups[k].name = k;
            groups[k].color = language.color;
            addExtensions(groups[k], language.extensions);

        } else {
            if(language.group) {
                if(!!!groups[language.group]) {
                    groups[language.group] = {};
                    groups[language.group].extensions = [];
                }
                addExtensions(groups[language.group], language.extensions);
            } else {
                // console.log(
                //     util.format(
                //         "----------------- no color:%s (%s)",
                //         k,
                //         language.type)
                // );
            }
        }
        // console.log(' ace_mode:', language.ace_mode, "\n", 'codemirror_mode: ', language.codemirror_mode);
    }

    for(var K of Object.keys(groups)) {

        lang = groups[K];

        o += "\n";
        o += '/**-';
        o += lang.name;
        o += '-*/';
        o += "\n";

        for(var i = 0; i < lang.extensions.length; i++) {
            ext = lang.extensions[i];
            if(settings.buildSwatches && dirOk) {
                fileName = [
                         settings.swatches,
                         settings.swatchName + ext
                        ].join(path.sep);

                fs.writeFileSync(fileName, '');
            }

            o += buildRule(ext);
            o += '{border-color:' + lang.color + ';}';
            o += "\n";
        }
    }
    o += getCssBottom();

    fs.writeFileSync(fileCss, o);
}

function addExtensions(group, extensions) {
    if(!(!!group.extensions))
        group.extensions = [];
    if(!!extensions)
        for(var i = 0; i < extensions.length; i++) {
            group.extensions.push(extensions[i]);
        }
}
/* if comparison of temp and local copy says their 
hash are the same, remove temp and do nothing(false)
otherwise make temp the local copy */

function removeTemporyFile() {
    try {
        fs.unlinkSync(languageFiles.temp);
    } catch(e) {
        console.log('failed to remove temp file');
    } finally {
        return true;
    }
}

function replaceLocalFile() {
    try {
        fs.renameSync(languageFiles.temp, languageFiles.local);
    } catch(e) {} finally {
        console.log("file replacement success");
        return true;
    }
}

function fileExists(file) {
    var exist = false;
    fs.openSync(file, 'r', function (err, fd) {
        if(!err) {
            fs.closeSync(fd);
            console.log("file exists");
            exist = true;
        }
    });
    return exist;
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
    } catch(e) {} finally {
        return content;
    }
}

function getCssBottom() {
    var content = '}';
    try {
        content = fs.readFileSync(getTemplateURI(settings.outputFile.bottom),
            'utf8');
    } catch(e) {} finally {
        return content;
    }

}

function fileIsNotEmpty(file) {
    var size = 0;
    try {
        size = fs.statSync(file)
            .size;
    } finally {
        return(size > 0);
    }
}

function download(remoteFile, temp) {

    var file = fs.createWriteStream(temp);

    var pro = new promise(function (resolve, reject) {
        https.get(url.parse(remoteFile), function (response) {

            response.on('data', function (chunk) {
                    file.write(chunk);
                })
                .on('error', function (err) {
                    reject(err);
                })
                .on('end', function () {
                    file.end();

                    if(fileIsNotEmpty(temp)) {
                        resolve('download succeed');
                    } else {
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
