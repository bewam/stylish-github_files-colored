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

var settings = {
    forceFresh: false,
    css: 'stylish-github_files-colored.css',
    buildSwatches: false,
    /* creates a swatches folder to see results */
    swatches: 'test_swatches',
    swatchName: 'testFile',
};

var languages = {
    localFile: "languages.yml",
    remoteFile: 'https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml'
};
const file_header = "head.css.tmpl";


needDownload(languages.localFile).then(function (successMessage) {
    console.log(successMessage);
    download(languages.remoteFile, languages.localFile).then(function (
        successMessage) {
        console.log('yeah ! ' + successMessage);
        readAndDump(languages.localFile, settings.css);
    }, function (err) {
        console.error(err);
        process.exit();
    });
}, function (err) {
    console.log(err);
    readAndDump(languages.localFile, settings.css);
});

function readAndDump(fileLanguages, fileCss) {
    console.log('readAndDump');
    var languages = yaml.safeLoad(fs.readFileSync(fileLanguages,
        'utf8'));
    var o = '',
        dirOk = false,
        fileName = '',
        k, l, language, err;


    o += fs.readFileSync(file_header, 'utf8');

    if(settings.buildSwatches) {
        try {
            dirOk = (!fs.mkdirSync(settings.swatches));
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
            o += '/**- ' + language.name + '-*/';
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

                    o += Buildselector(ext);
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
    o += '}';
    fs.writeFile(fileCss, o);
}

function needDownload(file) {
    var pro = new promise(function (ok, reject) {
        if(settings.forceFresh) {
            ok('download forced');
        }
        else {
            try {
                fs.open(file, 'r', function (err, fd) {
                    if(!err) {
                        reject(new Error('file exists'));
                        fs.close(fd);
                    }
                    else {
                        ok('file not present');
                    }

                });

                if(fileIsNotEmpty(file)) {
                    reject(new Error('file not empty'));
                }
                else {
                    ok('file not present or empty');
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

    var pro = new promise(function (ok, reject) {
        https.get(url.parse(remoteFile), function (response) {

            response.on('data', function (chunk) {
                file.write(chunk);
            }).on('error', function (err) {
                reject(err);
            }).on('end', function () {
                file.end();

                if(fileIsNotEmpty(localFile)) {
                    ok('download succeed');
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

function Buildselector(str) {
    return util.format('.js-directory-link[title$=\'%s\']', str);
}
