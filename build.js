#!/usr/bin/env nodejs

var fs = require('fs');
var https = require('https');
var url = require('url');
var util = require('util');

var promise = require('promise');
var yaml = require('js-yaml');

/**/ console.log = function () {}; /**/

var settings = {
    forceFresh: false,
    css : 'stylish-github_files-colored.css',
};

var languages = {
    localFile: "languages.yml",
    remoteFile: 'https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml'
};
const file_header = "head.css.tmpl";


if( needDownload(languages.localFile) )
{
    download(languages.remoteFile, languages.localFile).then(function (successMessage) {
        console.log('yeah ! '+ successMessage);
        readAndDump(languages.localFile, settings.css);
    }, function (err) {
        console.error(err);
        process.exit();
    });
}

function readAndDump(fileLanguages, fileCss) {
    var languages = yaml.safeLoad(fs.readFileSync(fileLanguages,
        'utf8'));
    var o = '',
        k, l, language;

    o += fs.readFileSync(file_header, 'utf8');

    for(k of Object.keys(languages)) {
        language = languages[k];
        language.name = k;

        if(language.color) {
            o += "\n";
            o += '/* ' + language.name + '*/';
            o += "\n";

            if(language.extensions) {
                for(var ext of language.extensions) {
                    o += Buildselector(ext);
                    o += '{border-color:' + language.color + ';}';
                    o += "\n";
                }
            }
        } else
            console.log(util.format("no color:%s (%s)", language.name, language.type));
    }
    o += '}';
    fs.writeFile(fileCss, o);
}
function needDownload(file) {

    var pro = new promise(function (ok, reject) {
        if(settings.forceFresh){
            ok('download forced');
        }
        try {
            fs.open( file, 'r', function (err, fd) {
                if(err) {
                    reject(err);
                } else {
                    fs.close(fd);
                }

            });

            if(! fileIsNotEmpty(file))
                reject(new Error('file not empty'));

        } catch (e) {

        } finally {
            ok('file not present or empty');
        }
    });
    return pro;
}
function fileIsNotEmpty(file){
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
                }) .on('error', function (err) {
                    reject(err);
                }).on('end', function () {
                    file.end();

                    if(fileIsNotEmpty(localFile)) {
                        ok('download succeed');
                    }
                    else {
                        reject('download failed, file empty');
                    }
                });
        });
    });
    return pro;
}
function Buildselector(str) {
    return util.format('.js-directory-link[title$=\'%s\']', str);
}
