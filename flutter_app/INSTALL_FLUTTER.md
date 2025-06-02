# Flutter 安装指南

由于系统中没有检测到Flutter SDK，请按照以下步骤安装Flutter开发环境。

## macOS 安装步骤

### 方法一：使用官方安装包（推荐）

1. **下载Flutter SDK**
   - 访问 [Flutter官网](https://flutter.dev/docs/get-started/install/macos)
   - 下载最新稳定版本的Flutter SDK
   - 或直接下载：[flutter_macos_3.16.0-stable.zip](https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_3.16.0-stable.zip)

2. **解压并移动到合适位置**
   ```bash
   cd ~/Downloads
   unzip flutter_macos_*-stable.zip
   sudo mv flutter /usr/local/
   ```

3. **配置环境变量**
   
   **对于 zsh (默认)：**
   ```bash
   echo 'export PATH="$PATH:/usr/local/flutter/bin"' >> ~/.zshrc
   source ~/.zshrc
   ```
   
   **对于 bash：**
   ```bash
   echo 'export PATH="$PATH:/usr/local/flutter/bin"' >> ~/.bash_profile
   source ~/.bash_profile
   ```

4. **验证安装**
   ```bash
   flutter --version
   flutter doctor
   ```

### 方法二：使用 Homebrew

1. **安装 Homebrew**（如果还没有安装）
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **安装 Flutter**
   ```bash
   brew install --cask flutter
   ```

3. **验证安装**
   ```bash
   flutter --version
   flutter doctor
   ```

## 配置开发环境

### 1. 安装 Xcode（iOS开发）

```bash
# 从 App Store 安装 Xcode
# 或使用命令行工具
xcode-select --install
```

### 2. 安装 Android Studio（Android开发）

1. 下载并安装 [Android Studio](https://developer.android.com/studio)
2. 启动 Android Studio
3. 安装 Android SDK 和相关工具
4. 创建 Android 虚拟设备 (AVD)

### 3. 配置 Flutter

```bash
# 接受 Android 许可证
flutter doctor --android-licenses

# 检查环境配置
flutter doctor
```

### 4. 安装 VS Code 插件（可选但推荐）

1. 安装 [VS Code](https://code.visualstudio.com/)
2. 安装以下插件：
   - Flutter
   - Dart
   - Flutter Widget Snippets

## 运行项目

安装完成后，在项目目录中运行：

```bash
cd /Users/liuyinghao/Desktop/Trae/Vibe/1.Todolist/flutter_app

# 获取依赖
flutter pub get

# 检查可用设备
flutter devices

# 运行应用（调试模式）
flutter run

# 或指定设备运行
flutter run -d chrome  # 在浏览器中运行
flutter run -d macos   # 在macOS桌面应用中运行
```

## 故障排除

### 常见问题

1. **权限问题**
   ```bash
   sudo chown -R $(whoami) /usr/local/flutter
   ```

2. **PATH 环境变量未生效**
   - 重启终端
   - 或手动执行：`source ~/.zshrc`

3. **Android 许可证问题**
   ```bash
   flutter doctor --android-licenses
   # 输入 'y' 接受所有许可证
   ```

4. **iOS 模拟器问题**
   ```bash
   open -a Simulator
   ```

### 检查安装状态

运行以下命令检查所有组件的安装状态：

```bash
flutter doctor -v
```

输出应该类似于：

```
Doctor summary (to see all details, run flutter doctor -v):
[✓] Flutter (Channel stable, 3.16.0, on macOS 14.0 23A344 darwin-arm64, locale en-US)
[✓] Android toolchain - develop for Android devices (Android SDK version 34.0.0)
[✓] Xcode - develop for iOS and macOS (Xcode 15.0)
[✓] Chrome - develop for the web
[✓] Android Studio (version 2023.1)
[✓] VS Code (version 1.84.2)
[✓] Connected device (4 available)
[✓] Network resources

• No issues found!
```

## 快速验证

安装完成后，可以创建一个测试项目验证：

```bash
# 创建测试项目
flutter create test_app
cd test_app

# 运行测试项目
flutter run
```

如果能成功运行，说明Flutter环境配置正确！

---

**安装完成后，返回到TodoList项目目录运行 `flutter pub get` 和 `flutter run` 即可启动应用。**