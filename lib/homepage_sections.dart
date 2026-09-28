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
    final cards = section.cards.where((c) => c.enabled).toList();
    final hero = section.type == 'hero';
    return Padding(
      key: ValueKey('home-section-${section.id}'),
      padding: EdgeInsets.symmetric(vertical: hero ? 48 : 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (hero) ...[
            const Align(
              alignment: AlignmentDirectional.centerStart,
              child: LogoMark(large: true),
            ),
            const SizedBox(height: 24),
            Text(
              section.title,
              style: appText(
                color: AppColors.gold,
                fontSize: 17,
                weight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              cms.company.nameAr,
              style: displayText(
                fontSize: MediaQuery.sizeOf(context).width < 700 ? 34 : 54,
                color: AppColors.ink,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              cms.company.taglineAr,
              style: appText(
                color: AppColors.accent,
                fontSize: 18,
                weight: FontWeight.w800,
              ),
            ),
          ] else
            Text(
              section.title,
              style: displayText(fontSize: 30, color: AppColors.ink),
            ),
          if (section.description.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 12, bottom: 24),
              child: Text(
                section.description,
                style: appText(
                  color: AppColors.muted,
                  fontSize: hero ? 19 : 16,
                  height: 1.8,
                ),
              ),
            ),
          if (homeWebUrl(section.imageUrl))
            Padding(
              padding: const EdgeInsets.only(bottom: 20),
              child: HomeRemoteImage(url: section.imageUrl),
            ),
          if (hero || section.type == 'market')
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                for (final card in cards) HomeCardAction(card: card, cms: cms),
              ],
            ),
          if (section.type == 'cards')
            LayoutBuilder(
              builder: (context, constraints) {
                final columns = constraints.maxWidth >= 1000
                    ? 4
                    : constraints.maxWidth >= 620
                    ? 3
                    : constraints.maxWidth >= 420
                    ? 2
                    : 1;
                final width =
                    (constraints.maxWidth - 14 * (columns - 1)) / columns;
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
            ),
          if (section.type == 'market' &&
              cms.companyListings.any((item) => item.enabled))
            Padding(
              padding: const EdgeInsets.only(top: 24),
              child: CompanyListingsGrid(
                items: cms.companyListings
                    .where((item) => item.enabled)
                    .take(3)
                    .toList(),
              ),
            ),
          if (section.type == 'contact') ...[
            ContactMethods(company: cms.company),
            const SizedBox(height: 24),
            TrustPanel(company: cms.company),
          ],
        ],
      ),
    );
  }
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
  const HomeCardAction({required this.card, required this.cms, super.key});
  final HomeCard card;
  final CmsContent cms;
  @override
  Widget build(BuildContext context) {
    final target = homeCardTarget(card, cms);
    if (target == null) return const SizedBox.shrink();
    return FilledButton.icon(
      onPressed: () => target.startsWith('/')
          ? context.go(target)
          : redirectToCheckout(target),
      icon: Icon(
        card.destinationType == 'download'
            ? Icons.download_rounded
            : Icons.arrow_back_rounded,
        size: 18,
      ),
      label: Text(card.buttonLabel.isEmpty ? 'استكشف' : card.buttonLabel),
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.accent,
        foregroundColor: AppColors.onAccent,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        textStyle: appText(weight: FontWeight.w800),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
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
