import 'dart:convert';
import 'dart:io';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

enum PaymentMethod {
  wechat,
  alipay,
  applePay,
  googlePay,
}

enum SubscriptionType {
  monthly,
  yearly,
}

/// 支付服务类
/// 集成微信支付、支付宝支付和应用内购买
class PaymentService {
  static const String baseUrl = 'http://localhost:3001/api';

  /// 初始化支付服务
  static Future<void> initialize() async {
    try {
      // 初始化微信支付
      await _initWechatPay();
      
      // 初始化支付宝
      await _initAlipay();
      
      // 初始化应用内购买
      if (Platform.isIOS) {
        await _initApplePay();
      } else if (Platform.isAndroid) {
        await _initGooglePay();
      }
      
      print('✅ 支付服务初始化完成');
    } catch (e) {
      print('❌ 支付服务初始化失败: $e');
      rethrow;
    }
  }
  
  /// 创建订阅订单
  static Future<PaymentOrder> createSubscriptionOrder({
    required SubscriptionType type,
    required PaymentMethod method,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/subscriptions/create'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${await _getAuthToken()}',
        },
        body: json.encode({
          'type': type.name,
          'payment_method': method.name,
        }),
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return PaymentOrder.fromJson(data);
      } else {
        throw Exception('创建订单失败: ${response.body}');
      }
    } catch (e) {
      print('❌ 创建订单失败: $e');
      rethrow;
    }
  }
  
  /// 微信支付
  static Future<PaymentResult> payWithWechat(PaymentOrder order) async {
    try {
      // 调用微信支付插件
      const platform = MethodChannel('payment/wechat');
      
      final result = await platform.invokeMethod('pay', {
        'appId': order.wechatParams!['appId'],
        'partnerId': order.wechatParams!['partnerId'],
        'prepayId': order.wechatParams!['prepayId'],
        'packageValue': order.wechatParams!['packageValue'],
        'nonceStr': order.wechatParams!['nonceStr'],
        'timeStamp': order.wechatParams!['timeStamp'],
        'sign': order.wechatParams!['sign'],
      });
      
      if (result['success'] == true) {
        // 验证支付结果
        await _verifyPayment(order.orderId);
        return PaymentResult.success(order.orderId);
      } else {
        return PaymentResult.failed(result['error'] ?? '支付失败');
      }
    } catch (e) {
      print('❌ 微信支付失败: $e');
      return PaymentResult.failed(e.toString());
    }
  }
  
  /// 支付宝支付
  static Future<PaymentResult> payWithAlipay(PaymentOrder order) async {
    try {
      // 调用支付宝支付插件
      const platform = MethodChannel('payment/alipay');
      
      final result = await platform.invokeMethod('pay', {
        'orderString': order.alipayParams!['orderString'],
      });
      
      if (result['resultStatus'] == '9000') {
        // 支付成功
        await _verifyPayment(order.orderId);
        return PaymentResult.success(order.orderId);
      } else if (result['resultStatus'] == '6001') {
        // 用户取消
        return PaymentResult.cancelled();
      } else {
        // 支付失败
        return PaymentResult.failed(result['memo'] ?? '支付失败');
      }
    } catch (e) {
      print('❌ 支付宝支付失败: $e');
      return PaymentResult.failed(e.toString());
    }
  }
  
  /// Apple Pay (应用内购买)
  static Future<PaymentResult> payWithApplePay(PaymentOrder order) async {
    try {
      // 调用 iOS 应用内购买
      const platform = MethodChannel('payment/apple');
      
      final result = await platform.invokeMethod('purchase', {
        'productId': order.appleParams!['productId'],
      });
      
      if (result['success'] == true) {
        // 验证收据
        await _verifyAppleReceipt(result['receipt']);
        return PaymentResult.success(order.orderId);
      } else {
        return PaymentResult.failed(result['error'] ?? '购买失败');
      }
    } catch (e) {
      print('❌ Apple Pay 失败: $e');
      return PaymentResult.failed(e.toString());
    }
  }
  
  /// Google Play 支付
  static Future<PaymentResult> payWithGooglePay(PaymentOrder order) async {
    try {
      // 调用 Android 应用内购买
      const platform = MethodChannel('payment/google');
      
      final result = await platform.invokeMethod('purchase', {
        'productId': order.googleParams!['productId'],
      });
      
      if (result['success'] == true) {
        // 验证购买
        await _verifyGooglePurchase(result['purchaseToken']);
        return PaymentResult.success(order.orderId);
      } else {
        return PaymentResult.failed(result['error'] ?? '购买失败');
      }
    } catch (e) {
      print('❌ Google Pay 失败: $e');
      return PaymentResult.failed(e.toString());
    }
  }
  
  /// 查询订阅状态
  static Future<SubscriptionStatus> getSubscriptionStatus() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/subscriptions/status'),
        headers: {
          'Authorization': 'Bearer ${await _getAuthToken()}',
        },
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return SubscriptionStatus.fromJson(data);
      } else {
        throw Exception('查询订阅状态失败: ${response.body}');
      }
    } catch (e) {
      print('❌ 查询订阅状态失败: $e');
      rethrow;
    }
  }
  
  /// 取消订阅
  static Future<bool> cancelSubscription() async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/subscriptions/cancel'),
        headers: {
          'Authorization': 'Bearer ${await _getAuthToken()}',
        },
      );
      
      return response.statusCode == 200;
    } catch (e) {
      print('❌ 取消订阅失败: $e');
      return false;
    }
  }
  
  // 私有方法
  
  /// 初始化微信支付
  static Future<void> _initWechatPay() async {
    try {
      const platform = MethodChannel('payment/wechat');
      await platform.invokeMethod('init', {
        'appId': 'your_wechat_appid',
      });
    } catch (e) {
      print('微信支付初始化失败: $e');
    }
  }
  
  /// 初始化支付宝
  static Future<void> _initAlipay() async {
    try {
      const platform = MethodChannel('payment/alipay');
      await platform.invokeMethod('init');
    } catch (e) {
      print('支付宝初始化失败: $e');
    }
  }
  
  /// 初始化 Apple Pay
  static Future<void> _initApplePay() async {
    try {
      const platform = MethodChannel('payment/apple');
      await platform.invokeMethod('init');
    } catch (e) {
      print('Apple Pay 初始化失败: $e');
    }
  }
  
  /// 初始化 Google Pay
  static Future<void> _initGooglePay() async {
    try {
      const platform = MethodChannel('payment/google');
      await platform.invokeMethod('init');
    } catch (e) {
      print('Google Pay 初始化失败: $e');
    }
  }
  
  /// 获取认证令牌
  static Future<String> _getAuthToken() async {
    // 从本地存储获取用户令牌
    // 这里需要根据实际的认证实现来获取
    return 'your_auth_token';
  }
  
  /// 验证支付结果
  static Future<void> _verifyPayment(String orderId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/payment/verify'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${await _getAuthToken()}',
        },
        body: json.encode({
          'order_id': orderId,
        }),
      );
      
      if (response.statusCode != 200) {
        throw Exception('支付验证失败');
      }
    } catch (e) {
      print('❌ 支付验证失败: $e');
      rethrow;
    }
  }
  
  /// 验证 Apple 收据
  static Future<void> _verifyAppleReceipt(String receipt) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/payment/apple/verify'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${await _getAuthToken()}',
        },
        body: json.encode({
          'receipt': receipt,
        }),
      );
      
      if (response.statusCode != 200) {
        throw Exception('Apple 收据验证失败');
      }
    } catch (e) {
      print('❌ Apple 收据验证失败: $e');
      rethrow;
    }
  }
  
  /// 验证 Google 购买
  static Future<void> _verifyGooglePurchase(String purchaseToken) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/payment/google/verify'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${await _getAuthToken()}',
        },
        body: json.encode({
          'purchase_token': purchaseToken,
        }),
      );
      
      if (response.statusCode != 200) {
        throw Exception('Google 购买验证失败');
      }
    } catch (e) {
      print('❌ Google 购买验证失败: $e');
      rethrow;
    }
  }
}

/// 支付订单模型
class PaymentOrder {
  final String orderId;
  final double amount;
  final String currency;
  final SubscriptionType type;
  final PaymentMethod method;
  final Map<String, dynamic>? wechatParams;
  final Map<String, dynamic>? alipayParams;
  final Map<String, dynamic>? appleParams;
  final Map<String, dynamic>? googleParams;
  
  PaymentOrder({
    required this.orderId,
    required this.amount,
    required this.currency,
    required this.type,
    required this.method,
    this.wechatParams,
    this.alipayParams,
    this.appleParams,
    this.googleParams,
  });
  
  factory PaymentOrder.fromJson(Map<String, dynamic> json) {
    return PaymentOrder(
      orderId: json['order_id'],
      amount: json['amount'].toDouble(),
      currency: json['currency'],
      type: SubscriptionType.values.firstWhere(
        (e) => e.name == json['type'],
      ),
      method: PaymentMethod.values.firstWhere(
        (e) => e.name == json['payment_method'],
      ),
      wechatParams: json['wechat_params'],
      alipayParams: json['alipay_params'],
      appleParams: json['apple_params'],
      googleParams: json['google_params'],
    );
  }
}

/// 支付结果模型
class PaymentResult {
  final bool success;
  final String? orderId;
  final String? error;
  final bool cancelled;
  
  PaymentResult._({
    required this.success,
    this.orderId,
    this.error,
    this.cancelled = false,
  });
  
  factory PaymentResult.success(String orderId) {
    return PaymentResult._(
      success: true,
      orderId: orderId,
    );
  }
  
  factory PaymentResult.failed(String error) {
    return PaymentResult._(
      success: false,
      error: error,
    );
  }
  
  factory PaymentResult.cancelled() {
    return PaymentResult._(
      success: false,
      cancelled: true,
    );
  }
}

/// 订阅状态模型
class SubscriptionStatus {
  final bool isActive;
  final SubscriptionType? type;
  final DateTime? expiryDate;
  final PaymentMethod? paymentMethod;
  final bool autoRenew;
  
  SubscriptionStatus({
    required this.isActive,
    this.type,
    this.expiryDate,
    this.paymentMethod,
    this.autoRenew = false,
  });
  
  factory SubscriptionStatus.fromJson(Map<String, dynamic> json) {
    return SubscriptionStatus(
      isActive: json['is_active'],
      type: json['type'] != null
          ? SubscriptionType.values.firstWhere(
              (e) => e.name == json['type'],
            )
          : null,
      expiryDate: json['expiry_date'] != null
          ? DateTime.parse(json['expiry_date'])
          : null,
      paymentMethod: json['payment_method'] != null
          ? PaymentMethod.values.firstWhere(
              (e) => e.name == json['payment_method'],
            )
          : null,
      autoRenew: json['auto_renew'] ?? false,
    );
  }
  
  /// 是否即将过期（7天内）
  bool get isExpiringSoon {
    if (expiryDate == null) return false;
    final now = DateTime.now();
    final difference = expiryDate!.difference(now).inDays;
    return difference <= 7 && difference > 0;
  }
  
  /// 剩余天数
  int get daysRemaining {
    if (expiryDate == null) return 0;
    final now = DateTime.now();
    final difference = expiryDate!.difference(now).inDays;
    return difference > 0 ? difference : 0;
  }
}

/// 支付配置
class PaymentConfig {
  // 微信支付配置
  static const String wechatAppId = 'your_wechat_appid';
  
  // 支付宝配置
  static const String alipayScheme = 'your_alipay_scheme';
  
  // Apple Pay 产品ID
  static const String appleMonthlyProductId = 'com.yourapp.premium.monthly';
  static const String appleYearlyProductId = 'com.yourapp.premium.yearly';
  
  // Google Play 产品ID
  static const String googleMonthlyProductId = 'premium_monthly';
  static const String googleYearlyProductId = 'premium_yearly';
  
  // 价格配置
  static const Map<SubscriptionType, double> prices = {
    SubscriptionType.monthly: 6.0,
    SubscriptionType.yearly: 60.0,
  };

  /// 获取产品ID
  static String getProductId(PaymentMethod method, SubscriptionType type) {
    switch (method) {
      case PaymentMethod.applePay:
        return type == SubscriptionType.monthly
            ? appleMonthlyProductId
            : appleYearlyProductId;
      case PaymentMethod.googlePay:
        return type == SubscriptionType.monthly
            ? googleMonthlyProductId
            : googleYearlyProductId;
      default:
        throw Exception('Unknown payment method: $method');
    }
  }
  
  /// 获取价格
  static double getPrice(SubscriptionType type) {
    return prices[type] ?? 0.0;
  }
  
  /// 获取价格描述
  static String getPriceDescription(SubscriptionType type) {
    final price = getPrice(type);
    switch (type) {
      case SubscriptionType.monthly:
        return '¥${price.toStringAsFixed(0)}/月';
      case SubscriptionType.yearly:
        return '¥${price.toStringAsFixed(0)}/年';
    }
  }
}