const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 检查是否安装了必要的工具
function checkDependencies() {
    try {
        execSync('which convert', { stdio: 'ignore' });
        console.log('✅ ImageMagick 已安装');
        return true;
    } catch (error) {
        console.log('❌ ImageMagick 未安装');
        console.log('请安装 ImageMagick:');
        console.log('macOS: brew install imagemagick');
        console.log('Ubuntu: sudo apt-get install imagemagick');
        console.log('Windows: 下载并安装 https://imagemagick.org/script/download.php#windows');
        return false;
    }
}

// 生成不同尺寸的PNG图标
function generatePngIcons() {
    const svgPath = path.join(__dirname, '../assets/icon.svg');
    const assetsDir = path.join(__dirname, '../assets');
    
    // 确保assets目录存在
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }
    
    const sizes = [
        { size: 16, name: 'icon-16.png' },
        { size: 32, name: 'icon-32.png' },
        { size: 48, name: 'icon-48.png' },
        { size: 64, name: 'icon-64.png' },
        { size: 128, name: 'icon-128.png' },
        { size: 256, name: 'icon-256.png' },
        { size: 512, name: 'icon-512.png' },
        { size: 1024, name: 'icon-1024.png' },
        { size: 256, name: 'icon.png' } // 默认图标
    ];
    
    console.log('🎨 生成PNG图标...');
    
    sizes.forEach(({ size, name }) => {
        const outputPath = path.join(assetsDir, name);
        try {
            execSync(`convert "${svgPath}" -resize ${size}x${size} "${outputPath}"`);
            console.log(`✅ 生成 ${name} (${size}x${size})`);
        } catch (error) {
            console.error(`❌ 生成 ${name} 失败:`, error.message);
        }
    });
}

// 生成ICO文件 (Windows)
function generateIcoIcon() {
    const assetsDir = path.join(__dirname, '../assets');
    const icoPath = path.join(assetsDir, 'icon.ico');
    
    console.log('🪟 生成Windows ICO图标...');
    
    try {
        // 使用多个尺寸生成ICO文件
        const pngFiles = [
            'icon-16.png',
            'icon-32.png',
            'icon-48.png',
            'icon-64.png',
            'icon-128.png',
            'icon-256.png'
        ].map(name => path.join(assetsDir, name)).join(' ');
        
        execSync(`convert ${pngFiles} "${icoPath}"`);
        console.log('✅ 生成 icon.ico');
    } catch (error) {
        console.error('❌ 生成ICO文件失败:', error.message);
    }
}

// 生成ICNS文件 (macOS)
function generateIcnsIcon() {
    const assetsDir = path.join(__dirname, '../assets');
    const icnsPath = path.join(assetsDir, 'icon.icns');
    const iconsetDir = path.join(assetsDir, 'icon.iconset');
    
    console.log('🍎 生成macOS ICNS图标...');
    
    try {
        // 创建iconset目录
        if (!fs.existsSync(iconsetDir)) {
            fs.mkdirSync(iconsetDir);
        }
        
        // 复制PNG文件到iconset目录，使用macOS要求的命名
        const iconsetFiles = [
            { src: 'icon-16.png', dest: 'icon_16x16.png' },
            { src: 'icon-32.png', dest: 'icon_16x16@2x.png' },
            { src: 'icon-32.png', dest: 'icon_32x32.png' },
            { src: 'icon-64.png', dest: 'icon_32x32@2x.png' },
            { src: 'icon-128.png', dest: 'icon_128x128.png' },
            { src: 'icon-256.png', dest: 'icon_128x128@2x.png' },
            { src: 'icon-256.png', dest: 'icon_256x256.png' },
            { src: 'icon-512.png', dest: 'icon_256x256@2x.png' },
            { src: 'icon-512.png', dest: 'icon_512x512.png' },
            { src: 'icon-1024.png', dest: 'icon_512x512@2x.png' }
        ];
        
        iconsetFiles.forEach(({ src, dest }) => {
            const srcPath = path.join(assetsDir, src);
            const destPath = path.join(iconsetDir, dest);
            if (fs.existsSync(srcPath)) {
                fs.copyFileSync(srcPath, destPath);
            }
        });
        
        // 使用iconutil生成icns文件
        if (process.platform === 'darwin') {
            execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`);
            console.log('✅ 生成 icon.icns');
            
            // 清理临时目录
            execSync(`rm -rf "${iconsetDir}"`);
        } else {
            console.log('⚠️  ICNS文件只能在macOS上生成');
        }
    } catch (error) {
        console.error('❌ 生成ICNS文件失败:', error.message);
    }
}

// 主函数
function main() {
    console.log('🚀 开始生成应用图标...');
    
    if (!checkDependencies()) {
        process.exit(1);
    }
    
    generatePngIcons();
    generateIcoIcon();
    generateIcnsIcon();
    
    console.log('\n🎉 图标生成完成！');
    console.log('生成的文件:');
    console.log('- PNG图标: assets/icon*.png');
    console.log('- Windows图标: assets/icon.ico');
    if (process.platform === 'darwin') {
        console.log('- macOS图标: assets/icon.icns');
    }
}

if (require.main === module) {
    main();
}

module.exports = { generatePngIcons, generateIcoIcon, generateIcnsIcon };