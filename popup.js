chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    var tabId = tabs[0].id;
    try {
        chrome.tabs.get(tabId, function(tab) {

            var git = gitDetails(tab.url)
            var index = (tab.url).indexOf(git.type)
            if (index > -1) {
                if (git.type == 'tree') {
                    document.getElementById('dir').innerText = 'Directory :'
                    document.getElementById('down_btn').style.display = "block";
                    document.getElementById('down_btn_file').style.display = "none";
                } else if (git.type == 'blob') {
                    document.getElementById('dir').innerText = 'File :'
                    document.getElementById('down_btn').style.display = "none";
                    document.getElementById('down_btn_file').style.display = "block";
                }
                document.getElementById('repo-scroll').innerText = git.repo
                document.getElementById('dir-scroll').innerText = git.dir
                document.getElementById('download').style.display = "block";
                document.getElementById('noDownload').style.display = "none";

                $('#down_btn_file').click(function(e) {
                    e.preventDefault();
                    var link = "https://api.github.com/repos/" + git.repo + "/contents/" + git.dir + "?ref=" + git.ref;
                    download_file(link)
                })

                function download_file(link) {
                    var a = document.getElementById("link");
                    $.get(link, (response) => {
                        var filename = response.name;

                        var httpRequest = new XMLHttpRequest();
                        httpRequest.open("GET", response.download_url);
                        httpRequest.onload = function() {
                            var content = this.responseText
                            var blob = new Blob([content], {
                                type: "text/plain;charset=utf-8"
                            });
                            saveAs(blob, filename);
                        }
                        httpRequest.send()

                    });
                }

                $('#down_btn').click(function(e) {
                    e.preventDefault();
                    var btn = document.getElementById('down_btn');
                    btn.innerText = "Generating Zip File..."
                    btn.disabled = true
                    console.log(git.main_dir)
                    console.log(git.rem_path)
                    var link = "https://api.github.com/repos/" + git.repo + "/contents/" + git.dir + "?ref=" + git.ref;
                    generate_zip(link, git.main_dir, git.rem_path);
                });

                function generate_zip(link, main_dir, rem_path) {
                    var zip = new JSZip();
                    var a = document.getElementById("download_link_btn");

                    function buildZip(html_url) {
                        var urls = [];

                        $.get(html_url, (response) => {
                            for (var i = response.length - 1; i >= 0; i--) {
                                if (response[i].type == "dir") {
                                    buildZip(response[i].url)

                                } else {
                                    if (response[i].download_url) {
                                        if (rem_path) {
                                            var path = (response[i].path).replace(rem_path, "")
                                        } else {
                                            var path = response[i].path
                                        }
                                        let current_file = {
                                            'path': path,
                                            'download_url': response[i].download_url
                                        }
                                        urls.push(current_file)
                                    } else {
                                        console.log(response[i]);
                                    }
                                }
                            }

                            function request(url) {
                                return new Promise(function(resolve) {
                                    var httpRequest = new XMLHttpRequest();
                                    httpRequest.open("GET", url.download_url);
                                    httpRequest.onload = function() {
                                        zip.file(url.path, this.responseText);
                                        resolve()
                                    }
                                    httpRequest.send()
                                })
                            }

                            Promise.all(urls.map((url) => {
                                    return request(url)
                                }))
                                .then(() => {
                                    console.log(zip);
                                    zip.generateAsync({
                                            type: "blob"
                                        })
                                        .then((content) => {
                                            a.download = main_dir + " (PG_Git_Downloader)";
                                            a.href = URL.createObjectURL(content);
                                        });
                                })

                        })
                    }
                    buildZip(link);
                    setTimeout(function() {
                        document.getElementById('down_btn').style.display = "none";
                        document.getElementById('download_link_btn').style.display = "block"
                    }, 5000);
                }

            } else {
                document.getElementById('noDownload').style.display = "block";
                document.getElementById('download').style.display = "none";
            }
        });
    } catch (err) {
        console.log(err)
    }
})

function gitDetails(url) {
    var arr = url.split("/");
    var repo = arr[3] + "/" + arr[4];
    var index = url.indexOf(arr[7])
    var ref = arr[6]
    var type = arr[5]
    var dir = url.substring(index, url.length);
    var rem_arr = dir.split('/')
    if (rem_arr.length > 1) {
        var main_dir = rem_arr[rem_arr.length - 1];
        var rem_path = ""
        for (var i = 0; i < rem_arr.length - 1; i++) {
            rem_path += rem_arr[i] + "/"
        }
    } else {
        var rem_path = null;
        var main_dir = rem_arr[0]
    }
    return { repo, dir, ref, type, rem_path, main_dir }
}