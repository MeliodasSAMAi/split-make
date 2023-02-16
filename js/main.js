const appTemplate = {
    data() {
        return {
            canvas: null,
            cWidth: 600,
            cHeight: 400,
            blocks: [],
            files: [],
            canvas: null,
            sizeAuto: true,
            sortCur: '高度',
            ratio: '',
            noFit: '',
            sorts: {
                w: function (a, b) {
                    return b.w - a.w;
                },
                h: function (a, b) {
                    return b.h - a.h;
                },
                a: function (a, b) {
                    return b.area - a.area;
                },
                max: function (a, b) {
                    return Math.max(b.w, b.h) - Math.max(a.w, a.h);
                },
                min: function (a, b) {
                    return Math.min(b.w, b.h) - Math.min(a.w, a.h);
                },
            },

            //    导出图片
            imgName: 'sprite',
            imgExt: '.png',
            //    导出css
            cssName: 'index',
            //    导出xml
            xmlName: 'hotspot'
        }
    },
    mounted() {
        let canvasDom = document.getElementById('canvas');
        this.canvas = canvasDom.getContext('2d')
    },
    watch: {
        blocks(val) {
            console.log(val);
        },
        sortCur() {
            this.run();
        }
    },
    methods: {
        run() {
            let packer = this.cResize();
            this.blocks.sort(this.sortRun());
            packer.fit(this.blocks);
            this.canvasReset(packer.root.w, packer.root.h);
            setTimeout(() => {
                this.drawImage();
            }, 16);
            this.canvasBoundary(packer.root);
            this.report(packer.root.w, packer.root.h);
            setTimeout(() => {
                this.build();
            }, 160);
        },
        cResize() {
            if (this.sizeAuto) {
                return new GrowingPacker();
            } else {
                return new Packer(this.cWidth, this.cHeight);
            }
        },
        //sort
        sortRun() {
            switch (this.sortCur) {
                case "宽度":
                    return this.sortWidth;
                    break;
                case "高度":
                    return this.sortHeight;
                    break;
                case "面积":
                    return this.sortArea;
                    break;
                case "随机":
                    return function (a, b) {
                        return Math.random() - 0.5;
                    };
                    break;
                default:
                    this.blocks.sort();
                    break;
            }
        },
        sortWidth(a, b) {
            return this.msort(a, b, ['w', 'h']);
        },
        sortHeight(a, b) {
            return this.msort(a, b, ['h', 'w']);
        },
        sortArea(a, b) {
            return this.msort(a, b, ['a', 'h', 'w']);
        },
        msort(a, b, criteria) { /* sort by multiple criteria */
            let diff, n;
            for (n = 0; n < criteria.length; n++) {
                diff = this.sorts[criteria[n]](a, b);
                if (diff != 0)
                    return diff;
            }
            return 0;
        },
        //canvas
        canvasReset(width, height) {
            this.cWidth = width;
            this.cHeight = height;
            this.canvas.clearRect(0, 0, width, height);
        },
        canvasStroke(x, y, w, h) {
            this.canvas.strokeRect(x + 0.5, y + 0.5, w, h);
        },
        canvasBoundary(node) {
            if (node) {
                this.canvasStroke(node.x, node.y, node.w, node.h);
                this.canvasBoundary(node.down);
                this.canvasBoundary(node.right);
            }
        },
        report(w, h) {
            let fit = 0, noFit = [], block, len = this.blocks.length;
            for (let i = 0; i < len; i++) {
                block = this.blocks[i];
                if (block.fit) {
                    fit = fit + block.area;
                } else {
                    noFit.push("" + block.w + "x" + block.h);
                }
            }
            this.ratio = Math.round(100 * fit / (w * h));
            this.noFit = noFit;
        },
        dropImg($event) {
            let files = $event.dataTransfer.files;
            for (let file of files) {
                this.addItem(file);
            }
            setTimeout(() => {
                this.run();
            }, 160);
        },
        addItem(file) {
            let item = {};
            let fileReader = new FileReader();
            fileReader.readAsDataURL(file);
            fileReader.onload = e => {
                let img = new Image();
                img.src = e.currentTarget.result;
                img.onload = e => {
                    item = {
                        name: file.name,
                        w: e.currentTarget.naturalWidth,
                        h: e.currentTarget.naturalHeight,
                        num: 1,
                        size: file.size,
                        type: file.type,
                        data: e.currentTarget,
                        area: e.currentTarget.naturalWidth * e.currentTarget.naturalHeight
                    };
                    this.blocks.push(item);
                }
            }
        },
        drawImage() {
            this.blocks.forEach(item => {
                this.canvas.drawImage(item.data, item.fit.x, item.fit.y, item.w, item.h);
            })
        },
        //构建
        build() {
            this.exportImg();
            this.exportCss();
            this.exportXml();
            this.exportDict();
        },
        exportImg() {
            let tmpSrc = document.getElementById('canvas').toDataURL('image/png');
            document.getElementById('preImg').src = tmpSrc;
            document.getElementById('downloadImage').href = tmpSrc;
        },
        exportCss() {
            let result = '';
            this.blocks.forEach(item => {
                result += this.cssItemTmp(item.name, item.w, item.h, item.fit.x, item.fit.y);
            });
            document.getElementById('exportCss').innerText = result;
            this.buildCssFile(this.cssName, result);
        },
        cssItemTmp(id, w, h, x, y) {
            let cssTemplate = `
                .${id.split('.')[0]} {
                    background: url(${this.imgName + this.imgExt});
                    width:100%;
                    height:100%;
                    background-Size: ${w}px ${h}px;
                    background-Position:${x} ${y};
                }
            `;
            return cssTemplate;
        },
        buildCssFile(filename, content, contentType = 'application/octet-stream') {
            let blob = new Blob([content], {'type': contentType});
            document.getElementById('downCss').href = window.URL.createObjectURL(blob);
        },
        exportXml() {
            let result = '';
            this.blocks.forEach((item, i) => {
                result += this.xmlItemTmp(i, item.w, item.h, item.fit.x, item.fit.y);
            });
            document.getElementById('exportXml').innerText = `
            <krpano>
                ${result}
            </krpano>`;
            this.buildXmlFile(this.cssName, document.getElementById('exportXml').innerText);
        },
        xmlItemTmp(id, w, h, x, y) {
            let xmlTemplate = `
            <hotspot name='spot${id}' edge='bottom' type='image' keep='true' url='./${this.imgName + this.imgExt}' crop='${x}|${y}|${w}|${h}' ath='0' atv='0'/>
            `;
            return xmlTemplate;
        },
        buildXmlFile(filename, content, contentType = 'application/octet-stream') {
            let blob = new Blob([content], {'type': contentType});
            document.getElementById('downXml').href = window.URL.createObjectURL(blob);
        },
        exportDict(){
            let result = {};
            this.blocks.forEach(item=>{
                result[item.name.split('.')[0]] = `${item.fit.x}|${item.fit.y}|${item.w}|${item.h}`;
            })
            console.log(JSON.stringify(result))
        }

    }
}

const app = Vue.createApp(appTemplate).mount('#app');