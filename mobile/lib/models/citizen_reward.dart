class CitizenBadge {
  final String id;
  final String title;
  final String description;
  final String icon;
  final DateTime? unlockedAt;

  const CitizenBadge({
    required this.id,
    required this.title,
    required this.description,
    required this.icon,
    this.unlockedAt,
  });

  bool get isUnlocked => unlockedAt != null;

  factory CitizenBadge.fromJson(Map<String, dynamic> json) {
    return CitizenBadge(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      icon: json['icon'] as String? ?? '🛡️',
      unlockedAt: json['unlockedAt'] != null ? DateTime.tryParse(json['unlockedAt'] as String) : null,
    );
  }
}

class CitizenLevel {
  final int number;
  final String title;
  final String badgeIcon;
  final int minPoints;
  final int maxPoints;
  final int progressPercentage;

  const CitizenLevel({
    required this.number,
    required this.title,
    required this.badgeIcon,
    required this.minPoints,
    required this.maxPoints,
    required this.progressPercentage,
  });

  factory CitizenLevel.fromJson(Map<String, dynamic> json) {
    return CitizenLevel(
      number: json['number'] as int? ?? 1,
      title: json['title'] as String? ?? 'Éclaireur',
      badgeIcon: json['badgeIcon'] as String? ?? '🌱',
      minPoints: json['minPoints'] as int? ?? 0,
      maxPoints: json['maxPoints'] as int? ?? 100,
      progressPercentage: json['progressPercentage'] as int? ?? 0,
    );
  }
}

class RewardCoupon {
  final String id;
  final String catalogId;
  final String title;
  final String partner;
  final String code;
  final int costPoints;
  final DateTime redeemedAt;
  final String status;

  const RewardCoupon({
    required this.id,
    required this.catalogId,
    required this.title,
    required this.partner,
    required this.code,
    required this.costPoints,
    required this.redeemedAt,
    this.status = 'active',
  });

  factory RewardCoupon.fromJson(Map<String, dynamic> json) {
    return RewardCoupon(
      id: json['id'] as String? ?? '',
      catalogId: json['catalogId'] as String? ?? '',
      title: json['title'] as String? ?? '',
      partner: json['partner'] as String? ?? 'Partenaire CityFlow',
      code: json['code'] as String? ?? 'CITY-REWARD',
      costPoints: json['costPoints'] as int? ?? 0,
      redeemedAt: json['redeemedAt'] != null
          ? DateTime.tryParse(json['redeemedAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      status: json['status'] as String? ?? 'active',
    );
  }
}

class CatalogRewardItem {
  final String id;
  final String title;
  final String partner;
  final String category;
  final int costPoints;
  final String icon;
  final String description;

  int get pointsCost => costPoints;
  String get partnerName => partner;

  const CatalogRewardItem({
    required this.id,
    required this.title,
    required this.partner,
    required this.category,
    required this.costPoints,
    required this.icon,
    required this.description,
  });

  factory CatalogRewardItem.fromJson(Map<String, dynamic> json) {
    return CatalogRewardItem(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      partner: json['partner'] as String? ?? '',
      category: json['category'] as String? ?? '',
      costPoints: json['costPoints'] as int? ?? 100,
      icon: json['icon'] as String? ?? '🎁',
      description: json['description'] as String? ?? '',
    );
  }
}

class CitizenProfileData {
  final String userId;
  final String userName;
  final int reputationScore;
  final int reportsCount;
  final int confirmationsGiven;
  final CitizenLevel level;
  final List<CitizenBadge> badges;
  final List<RewardCoupon> redeemedRewards;

  const CitizenProfileData({
    required this.userId,
    required this.userName,
    required this.reputationScore,
    required this.reportsCount,
    required this.confirmationsGiven,
    required this.level,
    required this.badges,
    required this.redeemedRewards,
  });

  String get fullName => userName;
  String get name => userName;
  String get badgeTitle => level.title;

  CitizenProfileData copyWith({
    String? userId,
    String? userName,
    int? reputationScore,
    int? reportsCount,
    int? confirmationsGiven,
    CitizenLevel? level,
    List<CitizenBadge>? badges,
    List<RewardCoupon>? redeemedRewards,
  }) {
    return CitizenProfileData(
      userId: userId ?? this.userId,
      userName: userName ?? this.userName,
      reputationScore: reputationScore ?? this.reputationScore,
      reportsCount: reportsCount ?? this.reportsCount,
      confirmationsGiven: confirmationsGiven ?? this.confirmationsGiven,
      level: level ?? this.level,
      badges: badges ?? this.badges,
      redeemedRewards: redeemedRewards ?? this.redeemedRewards,
    );
  }

  factory CitizenProfileData.fromJson(Map<String, dynamic> json) {
    return CitizenProfileData(
      userId: json['userId'] as String? ?? 'user_current',
      userName: json['userName'] as String? ?? json['fullName'] as String? ?? 'Paul Enoumbissi',
      reputationScore: json['reputationScore'] as int? ?? 320,
      reportsCount: json['reportsCount'] as int? ?? 8,
      confirmationsGiven: json['confirmationsGiven'] as int? ?? 14,
      level: json['level'] != null
          ? CitizenLevel.fromJson(json['level'] as Map<String, dynamic>)
          : const CitizenLevel(
              number: 3,
              title: 'Guide de la Cité',
              badgeIcon: '🗺️',
              minPoints: 301,
              maxPoints: 700,
              progressPercentage: 55,
            ),
      badges: (json['badges'] as List<dynamic>?)
              ?.map((e) => CitizenBadge.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      redeemedRewards: (json['redeemedRewards'] as List<dynamic>?)
              ?.map((e) => RewardCoupon.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );
  }
}
