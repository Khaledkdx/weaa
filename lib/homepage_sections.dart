part of 'main.dart';

const homeSectionTypes = {
  'hero': 'التعريف بوعاء',
  'bio': 'نبذة وصورة',
  'cards': 'بطاقات',
  'market': 'معاينة عالم التقبيل',
  'contact': 'التواصل والبيانات الرسمية',
};
const homeDestinationTypes = {
  'service': 'خدمة موجودة',
  'form': 'نموذج انضمام',
  'page': 'صفحة داخلية',
  'external': 'رابط خارجي',
  'download': 'ملف تحميل',
  'contact': 'طلب عبر تواصل',
};

class HomeCard {
  const HomeCard({
    required this.id,
    required this.title,
    this.description = '',
    this.imageUrl = '',
    this.buttonLabel = 'استكشف',
    this.destinationType = 'contact',
    this.target = '',
    this.enabled = true,
  });
  final String id,
      title,
      description,
      imageUrl,
      buttonLabel,
      destinationType,
      target;
  final bool enabled;
  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'description': description,
    'imageUrl': imageUrl,
    'buttonLabel': buttonLabel,
    'destinationType': destinationType,
    'target': target,
    'enabled': enabled,
  };
  factory HomeCard.fromJson(Map<String, dynamic> json) => HomeCard(
    id: json['id']?.toString() ?? '',
    title: json['title']?.toString() ?? '',
    description: json['description']?.toString() ?? '',
    imageUrl: json['imageUrl']?.toString() ?? '',
    buttonLabel: json['buttonLabel']?.toString() ?? 'استكشف',
    destinationType: json['destinationType']?.toString() ?? 'contact',
    target: json['target']?.toString() ?? '',
    enabled: json['enabled'] != false,
  );
}

class HomeSection {
  const HomeSection({
    required this.id,
    required this.title,
    this.description = '',
    this.type = 'cards',
    this.imageUrl = '',
    this.enabled = true,
    this.cards = const [],
  });
  final String id, title, description, type, imageUrl;
  final bool enabled;
  final List<HomeCard> cards;
  HomeSection copyWith({
    String? title,
    String? description,
    String? type,
    String? imageUrl,
    bool? enabled,
    List<HomeCard>? cards,
  }) => HomeSection(
    id: id,
    title: title ?? this.title,
    description: description ?? this.description,
    type: type ?? this.type,
    imageUrl: imageUrl ?? this.imageUrl,
    enabled: enabled ?? this.enabled,
    cards: cards ?? this.cards,
  );
  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'description': description,
    'type': type,
    'imageUrl': imageUrl,
    'enabled': enabled,
    'cards': [for (final card in cards) card.toJson()],
  };
  factory HomeSection.fromJson(Map<String, dynamic> json) => HomeSection(
    id: json['id']?.toString() ?? '',
    title: json['title']?.toString() ?? '',
    description: json['description']?.toString() ?? '',
    type: json['type']?.toString() ?? 'cards',
    imageUrl: json['imageUrl']?.toString() ?? '',
    enabled: json['enabled'] != false,
    cards: json['cards'] is List
        ? [
            for (final card in json['cards'] as List)
              HomeCard.fromJson(Map<String, dynamic>.from(card as Map)),
          ]
        : const [],
  );
}

const defaultHomepageSections = [
  HomeSection(
    id: 'intro',
    title: 'اللوجستيات تبدأ من وعاء',
    type: 'hero',
    description:
        'خدمات لوجستية وإدارية تجمع احتياجات الأفراد والشركات في مكان واحد.',
    cards: [
      HomeCard(
        id: 'explore',
        title: 'استكشف الخدمات',
        buttonLabel: 'استكشف الخدمات',
        destinationType: 'page',
        target: '/services',
      ),
      HomeCard(
        id: 'register',
        title: 'سجل الآن',
        buttonLabel: 'سجل الآن',
        destinationType: 'page',
        target: '/join-us',
      ),
    ],
  ),
  HomeSection(id: 'founder', title: 'نبذة عن خادم القوم', type: 'bio'),
  HomeSection(
    id: 'individual',
    title: 'الخدمات الفردية',
    description: 'ابدأ باحتياجك، واختر الخدمة المناسبة لك.',
    cards: [
      HomeCard(
        id: 'light',
        title: 'الخدمات الفردية',
        description: 'حلول مرنة لاحتياجاتك اليومية.',
        destinationType: 'page',
        target: '/services/light',
      ),
      HomeCard(
        id: 'feasibility',
        title: 'دراسات الجدوى',
        description: 'ناقش مشروعك وخطواته مع فريق وعاء.',
      ),
      HomeCard(
        id: 'books',
        title: 'الكتب المتاحة للتحميل',
        buttonLabel: 'تحميل الكتاب',
        destinationType: 'download',
      ),
    ],
  ),
  HomeSection(
    id: 'operations',
    title: 'خدمات التشغيل والعقود',
    description: 'خيارات واضحة لتجهيز أعمالك وتشغيلها.',
    cards: [
      HomeCard(id: 'vehicles', title: 'السيارات'),
      HomeCard(
        id: 'couriers',
        title: 'المناديب',
        destinationType: 'page',
        target: '/join-us',
      ),
      HomeCard(
        id: 'contracts',
        title: 'العقود',
        destinationType: 'page',
        target: '/services/contracts',
      ),
      HomeCard(id: 'licenses', title: 'الترخيص'),
    ],
  ),
  HomeSection(
    id: 'transport',
    title: 'النقل البري',
    description: 'اختر نوع النقل، وأخبرنا بما تحتاجه.',
    cards: [
      HomeCard(id: 'heavy', title: 'النقل الثقيل'),
      HomeCard(id: 'light-transport', title: 'النقل الخفيف'),
      HomeCard(id: 'dyna', title: 'الدينات'),
      HomeCard(id: 'buses', title: 'الحافلات'),
      HomeCard(id: 'motorcycles', title: 'الدراجات'),
      HomeCard(id: 'sedan', title: 'السيارات السيدان'),
    ],
  ),
  HomeSection(
    id: 'market',
    title: 'عالم التقبيل',
    type: 'market',
    description: 'فرص بيع وشراء الشركات، وخطوتك التالية نحو الاستثمار.',
    cards: [
      HomeCard(
        id: 'sell',
        title: 'أريد بيع شركة',
        buttonLabel: 'أريد بيع شركة',
      ),
      HomeCard(
        id: 'buy',
        title: 'أريد شراء شركة',
        buttonLabel: 'أريد شراء شركة',
      ),
      HomeCard(
        id: 'market-all',
        title: 'استكشف الفرص',
        buttonLabel: 'استكشف الفرص',
        destinationType: 'page',
        target: '/company-market',
      ),
    ],
  ),
  HomeSection(
    id: 'join',
    title: 'انضم إلينا',
    description: 'اختر المسار الأقرب إليك وسجل بياناتك.',
    cards: [
      HomeCard(
        id: 'internal',
        title: 'مناديب داخل المملكة',
        buttonLabel: 'سجل الآن',
        destinationType: 'form',
        target: 'form:courier-internal',
      ),
      HomeCard(
        id: 'external',
        title: 'مناديب خارج المملكة',
        buttonLabel: 'سجل الآن',
        destinationType: 'form',
        target: 'form:courier-external',
      ),
      HomeCard(
        id: 'jobs',
        title: 'طالب وظيفة',
        buttonLabel: 'استعرض النماذج',
        destinationType: 'page',
        target: '/join-us',
      ),
    ],
  ),
  HomeSection(
    id: 'contact',
    title: 'تواصل مع وعاء',
    type: 'contact',
    description: 'قنواتنا الرسمية مفتوحة لاستفساراتك وطلباتك.',
  ),
];

bool homeWebUrl(String value) {
  final uri = Uri.tryParse(value.trim());
  return uri != null &&
      const {'https', 'http'}.contains(uri.scheme) &&
      uri.host.isNotEmpty;
}

String? homeCardTarget(HomeCard card, CmsContent cms) {
  switch (card.destinationType) {
    case 'service':
      final items = cms.serviceModels.where(
        (s) => s.stableId == card.target && s.slug != null,
      );
      return items.isEmpty ? null : '/services/${items.first.slug}';
    case 'form':
      final items = cms.joinForms.where(
        (f) => f.stableId == card.target && f.enabled,
      );
      return items.isEmpty ? null : '/join-us/${items.first.slug}';
    case 'page':
      return homeInternalPath(card.target, cms) ? card.target : null;
    case 'external':
    case 'download':
      return homeWebUrl(card.target) ? card.target : null;
    case 'contact':
      return Uri(
        path: '/contact',
        queryParameters: {'subject': card.title},
      ).toString();
    default:
      return null;
  }
}

bool homeInternalPath(String target, CmsContent cms) {
  final path = Uri.tryParse(target)?.path;
  if (!target.startsWith('/') || target.startsWith('//')) return false;
  return const {
        '/',
        '/services',
        '/services/light',
        '/services/contracts',
        '/frameworks',
        '/about',
        '/company-market',
        '/initiatives',
        '/contact',
        '/join-us',
      }.contains(path) ||
      cms.serviceModels.any(
        (s) => path == '/services/${s.slug}' && s.slug != null,
      ) ||
      cms.joinForms.any((f) => f.enabled && path == '/join-us/${f.slug}') ||
      cms.companyListings.any(
        (c) => c.enabled && path == '/company-market/${c.slug}',
      );
}

class HomepageSection extends StatelessWidget {
  const HomepageSection({required this.section, required this.cms, super.key});
  final HomeSection section;
  final CmsContent cms;

  @override
  Widget build(BuildContext context) {
    if (section.type == 'bio' && section.description.trim().isEmpty) {
      return const SizedBox.shrink();
    }
    final cards = section.cards
        .where((card) => card.enabled && homeCardTarget(card, cms) != null)
        .toList();
    final hero = section.type == 'hero';
    return Padding(
      key: ValueKey('home-section-${section.id}'),
      padding: EdgeInsets.only(top: hero ? 26 : 44, bottom: 48),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (hero)
            HomeHero(section: section, cards: cards, cms: cms)
          else if (section.type == 'bio')
            HomeFounderSection(section: section)
          else ...[
            if (section.id != 'contact')
              HomeSectionHeading(section: section, count: cards.length),
            if (section.id == 'individual')
              HomeIndividualServices(cards: cards, cms: cms)
            else if (section.id == 'operations')
              HomeOperationsList(cards: cards, cms: cms)
            else if (section.id == 'transport')
              HomeTransportList(cards: cards, cms: cms)
            else if (section.id == 'join')
              HomeJoinChoices(cards: cards, cms: cms)
            else if (section.type == 'cards')
              HomeCardGrid(cards: cards, cms: cms)
            else if (section.type == 'market')
              HomeMarketSection(cards: cards, cms: cms)
            else if (section.type == 'contact') ...[
              HomeContactHeader(section: section),
              const SizedBox(height: 28),
              ContactMethods(company: cms.company),
              const SizedBox(height: 28),
              TrustPanel(company: cms.company),
            ],
          ],
        ],
      ),
    );
  }
}

class HomeHero extends StatelessWidget {
  const HomeHero({
    required this.section,
    required this.cards,
    required this.cms,
    super.key,
  });

  final HomeSection section;
  final List<HomeCard> cards;
  final CmsContent cms;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 760;
        final content = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(width: 24, height: 2, color: AppColors.accent),
                const SizedBox(width: 10),
                Text(
                  'خدمات للأفراد والأعمال',
                  style: appText(
                    color: AppColors.accent,
                    weight: FontWeight.w900,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Text(
              section.title,
              textAlign: TextAlign.right,
              style: displayText(
                fontSize: compact ? 38 : 58,
                height: 1.2,
                color: AppColors.ink,
              ),
            ),
            const SizedBox(height: 14),
            Text(
              cms.company.nameAr,
              style: appText(
                fontSize: compact ? 18 : 21,
                color: AppColors.ink,
                weight: FontWeight.w900,
              ),
            ),
            if (cms.company.taglineAr.trim().isNotEmpty) ...[
              const SizedBox(height: 5),
              Text(
                cms.company.taglineAr,
                style: appText(
                  color: AppColors.muted,
                  fontSize: compact ? 15 : 17,
                  weight: FontWeight.w700,
                  height: 1.7,
                ),
              ),
            ],
            if (section.description.trim().isNotEmpty) ...[
              const SizedBox(height: 16),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 560),
                child: Text(
                  section.description,
                  style: appText(
                    color: AppColors.muted,
                    fontSize: compact ? 16 : 18,
                    height: 1.8,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 26),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                for (final card in cards)
                  HomeCardAction(
                    card: card,
                    cms: cms,
                    primary: card.id == 'register',
                  ),
              ],
            ),
          ],
        );

        final visual = homeWebUrl(section.imageUrl)
            ? HomeRemoteImage(url: section.imageUrl)
            : const HomeRouteNetwork();
        return Padding(
          padding: EdgeInsets.symmetric(vertical: compact ? 30 : 54),
          child: compact
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [content, const SizedBox(height: 32), visual],
                )
              : Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(flex: 11, child: visual),
                    const SizedBox(width: 64),
                    Expanded(flex: 13, child: content),
                  ],
                ),
        );
      },
    );
  }
}

class HomeRouteNetwork extends StatelessWidget {
  const HomeRouteNetwork({super.key});

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 760;
    return Container(
      constraints: BoxConstraints(minHeight: compact ? 250 : 440),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: veil(AppColors.accent, .28)),
      ),
      child: Stack(
        children: [
          Positioned.fill(child: CustomPaint(painter: HomeRoutePainter())),
          PositionedDirectional(
            top: 18,
            start: 18,
            child: _routeLabel('منظومة واحدة', Icons.hub_outlined),
          ),
          PositionedDirectional(
            top: compact ? 78 : 92,
            end: 18,
            child: _routeLabel('تخزين', Icons.warehouse_outlined),
          ),
          PositionedDirectional(
            top: compact ? 142 : 198,
            start: compact ? 28 : 46,
            child: _routeLabel('تشغيل', Icons.settings_suggest_outlined),
          ),
          PositionedDirectional(
            bottom: compact ? 52 : 76,
            end: compact ? 34 : 54,
            child: _routeLabel('نقل', Icons.local_shipping_outlined),
          ),
          PositionedDirectional(
            bottom: 18,
            start: 18,
            child: _routeLabel('توصيل', Icons.near_me_outlined),
          ),
          Align(
            alignment: Alignment.center,
            child: Container(
              width: compact ? 68 : 88,
              height: compact ? 68 : 88,
              decoration: BoxDecoration(
                color: AppColors.accent,
                borderRadius: BorderRadius.circular(8),
                boxShadow: [
                  BoxShadow(
                    color: veil(AppColors.accent, .18),
                    blurRadius: 28,
                    spreadRadius: 3,
                  ),
                ],
              ),
              child: Icon(
                Icons.account_tree_rounded,
                color: AppColors.onAccent,
                size: compact ? 30 : 38,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _routeLabel(String label, IconData icon) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    decoration: BoxDecoration(
      color: AppColors.background,
      border: Border.all(color: veil(AppColors.ink, .18)),
      borderRadius: BorderRadius.circular(8),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: AppColors.accent, size: 18),
        const SizedBox(width: 8),
        Text(
          label,
          style: appText(color: AppColors.ink, weight: FontWeight.w800),
        ),
      ],
    ),
  );
}

class HomeRoutePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final pathPaint = Paint()
      ..color = veil(AppColors.accent, .28)
      ..strokeWidth = 1.4
      ..style = PaintingStyle.stroke;
    final center = Offset(size.width * .5, size.height * .5);
    for (final point in [
      Offset(size.width * .72, size.height * .23),
      Offset(size.width * .26, size.height * .38),
      Offset(size.width * .72, size.height * .72),
      Offset(size.width * .24, size.height * .79),
    ]) {
      final path = Path()
        ..moveTo(center.dx, center.dy)
        ..quadraticBezierTo(
          (center.dx + point.dx) / 2,
          point.dy,
          point.dx,
          point.dy,
        );
      canvas.drawPath(path, pathPaint);
      canvas.drawCircle(
        point,
        3.5,
        Paint()
          ..color = AppColors.accent
          ..style = PaintingStyle.fill,
      );
    }
  }

  @override
  bool shouldRepaint(covariant HomeRoutePainter oldDelegate) => true;
}

class HomeFounderSection extends StatelessWidget {
  const HomeFounderSection({required this.section, super.key});
  final HomeSection section;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final image = homeWebUrl(section.imageUrl);
      final compact = constraints.maxWidth < 700;
      final text = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'من وعاء',
            style: appText(color: AppColors.accent, weight: FontWeight.w900),
          ),
          const SizedBox(height: 10),
          Text(section.title, style: displayText(fontSize: 30)),
          const SizedBox(height: 12),
          Text(
            section.description,
            style: appText(color: AppColors.muted, fontSize: 17, height: 1.8),
          ),
        ],
      );
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 28),
        decoration: BoxDecoration(
          border: Border.symmetric(
            horizontal: BorderSide(color: veil(AppColors.accent, .2)),
          ),
        ),
        child: compact
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  text,
                  if (image) ...[
                    const SizedBox(height: 20),
                    HomeRemoteImage(url: section.imageUrl),
                  ],
                ],
              )
            : Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(child: text),
                  if (image) ...[
                    const SizedBox(width: 28),
                    SizedBox(
                      width: 300,
                      child: HomeRemoteImage(url: section.imageUrl),
                    ),
                  ],
                ],
              ),
      );
    },
  );
}

class HomeSectionHeading extends StatelessWidget {
  const HomeSectionHeading({
    required this.section,
    required this.count,
    super.key,
  });
  final HomeSection section;
  final int count;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 700;
    return Padding(
      padding: const EdgeInsets.only(bottom: 22),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Container(
            width: 4,
            height: compact ? 42 : 52,
            color: AppColors.accent,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _sectionKicker(section.id),
                  style: appText(
                    color: AppColors.accent,
                    weight: FontWeight.w900,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  section.title,
                  style: displayText(fontSize: compact ? 26 : 34, height: 1.25),
                ),
                if (section.description.trim().isNotEmpty) ...[
                  const SizedBox(height: 5),
                  Text(
                    section.description,
                    style: appText(
                      color: AppColors.muted,
                      fontSize: 15,
                      height: 1.6,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (count > 0 && !compact)
            Text(
              count.toString().padLeft(2, '0'),
              textDirection: TextDirection.ltr,
              style: displayText(
                fontSize: 18,
                color: AppColors.muted,
                weight: FontWeight.w700,
              ),
            ),
        ],
      ),
    );
  }

  String _sectionKicker(String id) => switch (id) {
    'individual' => 'حلول للأفراد',
    'operations' => 'شراكات الأعمال',
    'transport' => 'حركة البضائع',
    'market' => 'استثمار ونمو',
    'join' => 'مسارات مهنية',
    _ => 'خدمات وعاء',
  };
}

class HomeCardGrid extends StatelessWidget {
  const HomeCardGrid({required this.cards, required this.cms, super.key});
  final List<HomeCard> cards;
  final CmsContent cms;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final columns = constraints.maxWidth >= 940
          ? 3
          : constraints.maxWidth >= 560
          ? 2
          : 1;
      final width = (constraints.maxWidth - (columns - 1) * 16) / columns;
      return Wrap(
        spacing: 16,
        runSpacing: 16,
        children: [
          for (final card in cards)
            SizedBox(
              width: width,
              child: HomepageCardTile(card: card, cms: cms),
            ),
        ],
      );
    },
  );
}

class HomeIndividualServices extends StatelessWidget {
  const HomeIndividualServices({
    required this.cards,
    required this.cms,
    super.key,
  });
  final List<HomeCard> cards;
  final CmsContent cms;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final columns = constraints.maxWidth >= 720 ? 2 : 1;
      final width = (constraints.maxWidth - (columns - 1) * 16) / columns;
      return Wrap(
        spacing: 16,
        runSpacing: 16,
        children: [
          for (final card in cards)
            SizedBox(
              width: width,
              child: HomepageCardTile(card: card, cms: cms),
            ),
        ],
      );
    },
  );
}

class HomeOperationsList extends StatelessWidget {
  const HomeOperationsList({required this.cards, required this.cms, super.key});
  final List<HomeCard> cards;
  final CmsContent cms;

  @override
  Widget build(BuildContext context) => Column(
    children: [
      for (var i = 0; i < cards.length; i++)
        HomeEditorialLink(
          card: cards[i],
          cms: cms,
          index: i,
          showDivider: i < cards.length - 1,
        ),
    ],
  );
}

class HomeEditorialLink extends StatelessWidget {
  const HomeEditorialLink({
    required this.card,
    required this.cms,
    required this.index,
    required this.showDivider,
    super.key,
  });
  final HomeCard card;
  final CmsContent cms;
  final int index;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    final target = homeCardTarget(card, cms);
    final body = Padding(
      padding: const EdgeInsets.symmetric(vertical: 18),
      child: Row(
        children: [
          SizedBox(
            width: 42,
            child: Text(
              (index + 1).toString().padLeft(2, '0'),
              textDirection: TextDirection.ltr,
              style: appText(color: AppColors.accent, weight: FontWeight.w900),
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  card.title,
                  style: appText(
                    fontSize: 19,
                    color: AppColors.ink,
                    weight: FontWeight.w900,
                  ),
                ),
                if (card.description.trim().isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    card.description,
                    style: appText(color: AppColors.muted),
                  ),
                ],
              ],
            ),
          ),
          Icon(Icons.arrow_back_rounded, color: AppColors.accent),
        ],
      ),
    );
    return Material(
      color: Colors.transparent,
      child: InkWell(
        key: ValueKey('home-action-${card.id}'),
        onTap: target == null
            ? null
            : () => target.startsWith('/')
                  ? context.go(target)
                  : redirectToCheckout(target),
        child: Column(
          children: [
            body,
            if (showDivider)
              Divider(height: 1, color: veil(AppColors.ink, .15)),
          ],
        ),
      ),
    );
  }
}

class HomeTransportList extends StatelessWidget {
  const HomeTransportList({required this.cards, required this.cms, super.key});
  final List<HomeCard> cards;
  final CmsContent cms;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final columns = constraints.maxWidth >= 900 ? 3 : 2;
      final width = constraints.maxWidth / columns;
      return Wrap(
        children: [
          for (var i = 0; i < cards.length; i++)
            SizedBox(
              width: width,
              child: HomeTransportOption(card: cards[i], cms: cms),
            ),
        ],
      );
    },
  );
}

class HomeTransportOption extends StatelessWidget {
  const HomeTransportOption({required this.card, required this.cms, super.key});
  final HomeCard card;
  final CmsContent cms;

  @override
  Widget build(BuildContext context) {
    final target = homeCardTarget(card, cms);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        key: ValueKey('home-action-${card.id}'),
        onTap: target == null
            ? null
            : () => target.startsWith('/')
                  ? context.go(target)
                  : redirectToCheckout(target),
        child: Container(
          constraints: const BoxConstraints(minHeight: 92),
          padding: const EdgeInsetsDirectional.fromSTEB(8, 16, 14, 16),
          decoration: BoxDecoration(
            border: BorderDirectional(
              start: BorderSide(color: veil(AppColors.accent, .28)),
              bottom: BorderSide(color: veil(AppColors.ink, .14)),
            ),
          ),
          child: Row(
            children: [
              Icon(
                Icons.local_shipping_outlined,
                color: AppColors.accent,
                size: 22,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  card.title,
                  style: appText(color: AppColors.ink, weight: FontWeight.w800),
                ),
              ),
              Icon(Icons.arrow_back_rounded, color: AppColors.muted, size: 18),
            ],
          ),
        ),
      ),
    );
  }
}

class HomeJoinChoices extends StatelessWidget {
  const HomeJoinChoices({required this.cards, required this.cms, super.key});
  final List<HomeCard> cards;
  final CmsContent cms;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final columns = constraints.maxWidth >= 900
          ? 3
          : constraints.maxWidth >= 560
          ? 2
          : 1;
      final width = (constraints.maxWidth - 14 * (columns - 1)) / columns;
      return Wrap(
        spacing: 14,
        runSpacing: 14,
        children: [
          for (final card in cards)
            SizedBox(
              width: width,
              child: HomepageCardTile(card: card, cms: cms),
            ),
        ],
      );
    },
  );
}

class HomeMarketSection extends StatelessWidget {
  const HomeMarketSection({required this.cards, required this.cms, super.key});
  final List<HomeCard> cards;
  final CmsContent cms;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Wrap(
        spacing: 12,
        runSpacing: 12,
        children: [
          for (final card in cards) HomeCardAction(card: card, cms: cms),
        ],
      ),
      if (cms.companyListings.any((item) => item.enabled)) ...[
        const SizedBox(height: 24),
        CompanyListingsGrid(
          items: cms.companyListings
              .where((item) => item.enabled)
              .take(3)
              .toList(),
        ),
      ],
    ],
  );
}

class HomeContactHeader extends StatelessWidget {
  const HomeContactHeader({required this.section, super.key});
  final HomeSection section;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(section.title, style: displayText(fontSize: 32)),
      if (section.description.trim().isNotEmpty) ...[
        const SizedBox(height: 8),
        Text(
          section.description,
          style: appText(color: AppColors.muted, fontSize: 16),
        ),
      ],
    ],
  );
}

class HomeRemoteImage extends StatelessWidget {
  const HomeRemoteImage({required this.url, super.key});
  final String url;
  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(8),
    child: AspectRatio(
      aspectRatio: 16 / 9,
      child: Image.network(
        url,
        fit: BoxFit.cover,
        loadingBuilder: (context, child, progress) => progress == null
            ? child
            : const Center(child: CircularProgressIndicator()),
        errorBuilder: (context, error, stack) => Center(
          child: Icon(
            Icons.image_not_supported_outlined,
            color: AppColors.muted,
          ),
        ),
      ),
    ),
  );
}

class HomeCardAction extends StatelessWidget {
  const HomeCardAction({
    required this.card,
    required this.cms,
    this.primary = false,
    super.key,
  });
  final HomeCard card;
  final CmsContent cms;
  final bool primary;
  @override
  Widget build(BuildContext context) {
    final target = homeCardTarget(card, cms);
    if (target == null) return const SizedBox.shrink();
    final icon = Icon(
      card.destinationType == 'download'
          ? Icons.download_rounded
          : Icons.arrow_back_rounded,
      size: 18,
    );
    final label = Text(card.buttonLabel.isEmpty ? 'استكشف' : card.buttonLabel);
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(8),
    );
    void onPressed() {
      if (target.startsWith('/')) {
        context.go(target);
      } else {
        redirectToCheckout(target);
      }
    }

    if (primary) {
      return FilledButton.icon(
        key: ValueKey('home-action-${card.id}'),
        onPressed: onPressed,
        icon: icon,
        label: label,
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.accent,
          foregroundColor: AppColors.onAccent,
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 18),
          textStyle: appText(weight: FontWeight.w900),
          shape: shape,
        ),
      );
    }
    return OutlinedButton.icon(
      key: ValueKey('home-action-${card.id}'),
      onPressed: onPressed,
      icon: icon,
      label: label,
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.ink,
        side: BorderSide(color: veil(AppColors.ink, .35)),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        textStyle: appText(weight: FontWeight.w800),
        shape: shape,
      ),
    );
  }
}

class HomepageCardTile extends StatelessWidget {
  const HomepageCardTile({required this.card, required this.cms, super.key});
  final HomeCard card;
  final CmsContent cms;
  @override
  Widget build(BuildContext context) {
    final target = homeCardTarget(card, cms);
    return Material(
      color: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: veil(AppColors.ink, .15)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: target == null
            ? null
            : () => target.startsWith('/')
                  ? context.go(target)
                  : redirectToCheckout(target),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (homeWebUrl(card.imageUrl)) ...[
                HomeRemoteImage(url: card.imageUrl),
                const SizedBox(height: 16),
              ] else
                Padding(
                  padding: const EdgeInsets.only(bottom: 18),
                  child: Icon(
                    card.destinationType == 'download'
                        ? Icons.menu_book_rounded
                        : card.destinationType == 'form'
                        ? Icons.assignment_ind_outlined
                        : Icons.arrow_outward_rounded,
                    color: AppColors.accent,
                    size: 26,
                  ),
                ),
              Text(
                card.title,
                style: appText(
                  fontSize: 20,
                  weight: FontWeight.w900,
                  color: AppColors.ink,
                ),
              ),
              if (card.description.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Text(
                    card.description,
                    style: appText(color: AppColors.muted, height: 1.6),
                  ),
                ),
              const SizedBox(height: 18),
              HomeCardAction(card: card, cms: cms),
            ],
          ),
        ),
      ),
    );
  }
}

class AdminHomepageEditor extends ConsumerStatefulWidget {
  const AdminHomepageEditor({required this.cms, super.key});
  final CmsContent cms;
  @override
  ConsumerState<AdminHomepageEditor> createState() =>
      _AdminHomepageEditorState();
}

class _AdminHomepageEditorState extends ConsumerState<AdminHomepageEditor> {
  bool busy = false;
  String message = '';
  Future<void> save(List<HomeSection> items) async {
    if (busy) return;
    setState(() {
      busy = true;
      message = 'جاري الحفظ';
    });
    try {
      await ref.read(cmsProvider.notifier).saveHomepageSections(items);
      if (mounted) setState(() => message = 'تم الحفظ');
    } catch (_) {
      if (mounted) setState(() => message = 'تعذر الحفظ، حاول مرة أخرى');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> edit(HomeSection? section) async {
    final saved = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => HomeSectionDialog(
        section: section,
        cms: ref.read(cmsProvider),
        onSave: (next) async {
          final items = [...ref.read(cmsProvider).homepageSections];
          final index = items.indexWhere((s) => s.id == next.id);
          if (index < 0) {
            items.add(next);
          } else {
            items[index] = next;
          }
          await ref.read(cmsProvider.notifier).saveHomepageSections(items);
        },
      ),
    );
    if (mounted && saved == true) setState(() => message = 'تم الحفظ');
  }

  @override
  Widget build(BuildContext context) {
    final items = widget.cms.homepageSections;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            FilledButton.icon(
              onPressed: busy ? null : () => edit(null),
              icon: const Icon(Icons.add),
              label: const Text('إضافة قسم'),
            ),
            if (message.isNotEmpty)
              Text(message, style: appText(color: AppColors.ink)),
          ],
        ),
        const SizedBox(height: 16),
        for (var i = 0; i < items.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: AdminPanel(
              title: items[i].title,
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text(
                    '${homeSectionTypes[items[i].type] ?? 'بطاقات'} · ${items[i].cards.length} بطاقات',
                    style: appText(color: AppColors.muted),
                  ),
                  IconButton(
                    tooltip: 'تعديل القسم والبطاقات',
                    onPressed: busy ? null : () => edit(items[i]),
                    icon: const Icon(Icons.edit_outlined),
                  ),
                  Switch(
                    value: items[i].enabled,
                    onChanged: busy
                        ? null
                        : (value) {
                            final next = [...items];
                            next[i] = items[i].copyWith(enabled: value);
                            save(next);
                          },
                  ),
                  Text(
                    items[i].enabled ? 'فعال' : 'متوقف',
                    style: appText(color: AppColors.ink),
                  ),
                  IconButton(
                    tooltip: 'نقل لأعلى',
                    onPressed: busy || i == 0
                        ? null
                        : () {
                            final next = [...items];
                            final item = next.removeAt(i);
                            next.insert(i - 1, item);
                            save(next);
                          },
                    icon: const Icon(Icons.arrow_upward),
                  ),
                  IconButton(
                    tooltip: 'نقل لأسفل',
                    onPressed: busy || i == items.length - 1
                        ? null
                        : () {
                            final next = [...items];
                            final item = next.removeAt(i);
                            next.insert(i + 1, item);
                            save(next);
                          },
                    icon: const Icon(Icons.arrow_downward),
                  ),
                  IconButton(
                    tooltip: 'حذف القسم',
                    onPressed: busy
                        ? null
                        : () async {
                            final yes = await confirmHomeDelete(
                              context,
                              'حذف قسم ${items[i].title}؟',
                            );
                            if (yes) await save([...items]..removeAt(i));
                          },
                    icon: Icon(Icons.delete_outline, color: AppColors.danger),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

Future<bool> confirmHomeDelete(BuildContext context, String title) async =>
    await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('حذف'),
          ),
        ],
      ),
    ) ??
    false;

class HomeSectionDialog extends StatefulWidget {
  const HomeSectionDialog({
    required this.section,
    required this.cms,
    required this.onSave,
    super.key,
  });
  final HomeSection? section;
  final CmsContent cms;
  final Future<void> Function(HomeSection) onSave;
  @override
  State<HomeSectionDialog> createState() => _HomeSectionDialogState();
}

class _HomeSectionDialogState extends State<HomeSectionDialog> {
  late final TextEditingController title, description, image;
  late String type;
  late bool enabled;
  late List<HomeCard> cards;
  bool saving = false;
  String status = 'تعديلات غير محفوظة';
  @override
  void initState() {
    super.initState();
    title = TextEditingController(text: widget.section?.title ?? 'قسم جديد');
    description = TextEditingController(
      text: widget.section?.description ?? '',
    );
    image = TextEditingController(text: widget.section?.imageUrl ?? '');
    type = widget.section?.type ?? 'cards';
    enabled = widget.section?.enabled ?? true;
    cards = [...widget.section?.cards ?? []];
  }

  @override
  void dispose() {
    title.dispose();
    description.dispose();
    image.dispose();
    super.dispose();
  }

  Future<void> save() async {
    if (title.text.trim().isEmpty ||
        image.text.isNotEmpty && !homeWebUrl(image.text)) {
      setState(
        () => status = 'أدخل عنوانًا ورابط صورة صالحًا أو اترك الصورة فارغة',
      );
      return;
    }
    setState(() {
      saving = true;
      status = 'جاري الحفظ';
    });
    try {
      await widget.onSave(
        HomeSection(
          id:
              widget.section?.id ??
              'home-${DateTime.now().microsecondsSinceEpoch}',
          title: title.text.trim(),
          description: description.text.trim(),
          imageUrl: image.text.trim(),
          type: type,
          enabled: enabled,
          cards: cards,
        ),
      );
      if (mounted) Navigator.pop(context, true);
    } catch (_) {
      if (mounted) {
        setState(() {
          saving = false;
          status = 'تعذر الحفظ؛ تعديلاتك ما زالت موجودة';
        });
      }
    }
  }

  Future<void> editCard(int? index) async {
    final result = await showDialog<HomeCard>(
      context: context,
      barrierDismissible: false,
      builder: (context) => HomeCardDialog(
        card: index == null ? null : cards[index],
        cms: widget.cms,
      ),
    );
    if (result != null) {
      setState(() {
        if (index == null) {
          cards.add(result);
        } else {
          cards[index] = result;
        }
        status = 'تعديلات غير محفوظة';
      });
    }
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('تحرير قسم الرئيسية'),
    content: SizedBox(
      width: 640,
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: title,
              decoration: const InputDecoration(labelText: 'العنوان'),
            ),
            TextField(
              controller: description,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'الوصف أو نص النبذة',
              ),
            ),
            TextField(
              controller: image,
              decoration: const InputDecoration(
                labelText: 'رابط الصورة (اختياري)',
              ),
            ),
            DropdownButtonFormField<String>(
              initialValue: type,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'نوع العرض'),
              items: [
                for (final entry in homeSectionTypes.entries)
                  DropdownMenuItem(value: entry.key, child: Text(entry.value)),
              ],
              onChanged: (value) => setState(() => type = value!),
            ),
            SwitchListTile(
              title: const Text('القسم فعال'),
              value: enabled,
              onChanged: (value) => setState(() => enabled = value),
            ),
            const SizedBox(height: 16),
            for (var i = 0; i < cards.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      cards[i].title,
                      style: appText(
                        color: AppColors.ink,
                        weight: FontWeight.w800,
                      ),
                    ),
                    Wrap(
                      children: [
                        IconButton(
                          tooltip: 'تعديل البطاقة',
                          onPressed: saving ? null : () => editCard(i),
                          icon: const Icon(Icons.edit_outlined),
                        ),
                        IconButton(
                          tooltip: 'نقل لأعلى',
                          onPressed: saving || i == 0
                              ? null
                              : () => setState(() {
                                  final card = cards.removeAt(i);
                                  cards.insert(i - 1, card);
                                }),
                          icon: const Icon(Icons.arrow_upward),
                        ),
                        IconButton(
                          tooltip: 'نقل لأسفل',
                          onPressed: saving || i == cards.length - 1
                              ? null
                              : () => setState(() {
                                  final card = cards.removeAt(i);
                                  cards.insert(i + 1, card);
                                }),
                          icon: const Icon(Icons.arrow_downward),
                        ),
                        IconButton(
                          tooltip: 'حذف البطاقة',
                          onPressed: saving
                              ? null
                              : () => setState(() => cards.removeAt(i)),
                          icon: const Icon(Icons.delete_outline),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            OutlinedButton.icon(
              onPressed: saving ? null : () => editCard(null),
              icon: const Icon(Icons.add),
              label: const Text('إضافة بطاقة'),
            ),
            const SizedBox(height: 12),
            Text(status, style: appText(color: AppColors.ink)),
          ],
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: saving ? null : () => Navigator.pop(context),
        child: const Text('إلغاء'),
      ),
      FilledButton.icon(
        onPressed: saving ? null : save,
        icon: const Icon(Icons.save_outlined),
        label: Text(saving ? 'جاري الحفظ' : 'حفظ القسم'),
      ),
    ],
  );
}

class HomeCardDialog extends StatefulWidget {
  const HomeCardDialog({required this.card, required this.cms, super.key});
  final HomeCard? card;
  final CmsContent cms;
  @override
  State<HomeCardDialog> createState() => _HomeCardDialogState();
}

class _HomeCardDialogState extends State<HomeCardDialog> {
  late final TextEditingController title, description, image, label, target;
  late String type;
  late bool enabled;
  String error = '';
  @override
  void initState() {
    super.initState();
    final card = widget.card;
    title = TextEditingController(text: card?.title ?? '');
    description = TextEditingController(text: card?.description ?? '');
    image = TextEditingController(text: card?.imageUrl ?? '');
    label = TextEditingController(text: card?.buttonLabel ?? 'استكشف');
    target = TextEditingController(text: card?.target ?? '');
    type = card?.destinationType ?? 'contact';
    enabled = card?.enabled ?? true;
  }

  @override
  void dispose() {
    for (final controller in [title, description, image, label, target]) {
      controller.dispose();
    }
    super.dispose();
  }

  void submit() {
    final card = HomeCard(
      id: widget.card?.id ?? 'card-${DateTime.now().microsecondsSinceEpoch}',
      title: title.text.trim(),
      description: description.text.trim(),
      imageUrl: image.text.trim(),
      buttonLabel: label.text.trim(),
      destinationType: type,
      target: target.text.trim(),
      enabled: enabled,
    );
    if (card.title.isEmpty ||
        card.imageUrl.isNotEmpty && !homeWebUrl(card.imageUrl) ||
        !(type == 'download' && card.target.isEmpty) &&
            homeCardTarget(card, widget.cms) == null) {
      setState(() => error = 'راجع العنوان ورابط الصورة والوجهة المختارة');
      return;
    }
    Navigator.pop(context, card);
  }

  @override
  Widget build(BuildContext context) {
    final choices = <String, String>{
      if (type == 'service')
        for (final item in widget.cms.serviceModels.where(
          (s) => s.slug != null,
        ))
          item.stableId: item.titleAr,
      if (type == 'form')
        for (final form in widget.cms.joinForms.where((f) => f.enabled))
          form.stableId: form.title,
    };
    return AlertDialog(
      title: const Text('تحرير البطاقة'),
      content: SizedBox(
        width: 560,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: title,
                decoration: const InputDecoration(labelText: 'عنوان البطاقة'),
              ),
              TextField(
                controller: description,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'الوصف'),
              ),
              TextField(
                controller: image,
                decoration: const InputDecoration(
                  labelText: 'رابط الصورة (اختياري)',
                ),
              ),
              TextField(
                controller: label,
                decoration: const InputDecoration(labelText: 'نص الزر'),
              ),
              DropdownButtonFormField<String>(
                initialValue: type,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'نوع الوجهة'),
                items: [
                  for (final entry in homeDestinationTypes.entries)
                    DropdownMenuItem(
                      value: entry.key,
                      child: Text(entry.value),
                    ),
                ],
                onChanged: (value) => setState(() {
                  type = value!;
                  target.clear();
                }),
              ),
              if (type == 'service' || type == 'form')
                DropdownButtonFormField<String>(
                  key: ValueKey('$type-${target.text}'),
                  initialValue: choices.containsKey(target.text)
                      ? target.text
                      : null,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'العنصر المرتبط',
                  ),
                  items: [
                    for (final entry in choices.entries)
                      DropdownMenuItem(
                        value: entry.key,
                        child: Text(entry.value),
                      ),
                  ],
                  onChanged: (value) =>
                      setState(() => target.text = value ?? ''),
                )
              else if (type != 'contact')
                TextField(
                  controller: target,
                  decoration: InputDecoration(
                    labelText: type == 'page'
                        ? 'المسار الداخلي'
                        : type == 'download'
                        ? 'رابط الملف (اختياري حتى توفره)'
                        : 'الرابط الخارجي',
                  ),
                ),
              SwitchListTile(
                title: const Text('البطاقة فعالة'),
                value: enabled,
                onChanged: (value) => setState(() => enabled = value),
              ),
              if (error.isNotEmpty)
                Text(error, style: appText(color: AppColors.danger)),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('إلغاء'),
        ),
        FilledButton(onPressed: submit, child: const Text('اعتماد البطاقة')),
      ],
    );
  }
}
