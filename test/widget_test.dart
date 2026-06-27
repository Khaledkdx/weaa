import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:weaa/main.dart';

void main() {
  test('youtubeEmbedUrlFrom supports common YouTube URLs', () {
    expect(
      youtubeEmbedUrlFrom('https://www.youtube.com/watch?v=b1RRMSReNs0'),
      'https://www.youtube.com/embed/b1RRMSReNs0',
    );
    expect(
      youtubeEmbedUrlFrom('https://youtu.be/b1RRMSReNs0'),
      'https://www.youtube.com/embed/b1RRMSReNs0',
    );
    expect(
      youtubeEmbedUrlFrom('https://www.youtube.com/embed/b1RRMSReNs0'),
      'https://www.youtube.com/embed/b1RRMSReNs0',
    );
    expect(youtubeEmbedUrlFrom('https://weaa-sa.com/videos/iron-dome'), isNull);
  });

  testWidgets('home route renders the WEAA production landing', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: WeaaApp()));
    await tester.pumpAndSettle();

    expect(find.text('شركة وعاء للخدمات اللوجستية والإدارية'), findsWidgets);
    expect(find.text('الواجهة المعتمدة'), findsOneWidget);
    expect(find.text('معلومات عامة'), findsWidgets);
    expect(find.text('الخدمات'), findsWidgets);
    expect(find.text('لوحة الأدمن'), findsNothing);
    expect(find.byType(Image), findsWidgets);
  });

  testWidgets('services route renders general sector information', (
    tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(child: WeaaApp(initialLocation: '/services')),
    );
    await tester.pumpAndSettle();

    expect(find.text('معلومات عامة'), findsWidgets);
    expect(find.text('التخزين'), findsOneWidget);
    expect(find.text('الشحن الدولي'), findsOneWidget);
    expect(find.text('القبة الحديدية'), findsNothing);
  });

  testWidgets('frameworks route renders actual selectable services', (
    tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(child: WeaaApp(initialLocation: '/frameworks')),
    );
    await tester.pumpAndSettle();

    expect(find.text('الخدمات'), findsWidgets);
    expect(find.text('القبة الحديدية'), findsWidgets);
    expect(find.text('الهرم الماسي'), findsWidgets);
    expect(find.byIcon(Icons.arrow_back_rounded), findsWidgets);
  });

  testWidgets(
    'service detail route renders video, form, and reviews for a model',
    (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: WeaaApp(initialLocation: '/services/iron-dome'),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('تفاصيل الخدمة'), findsOneWidget);
      expect(find.text('فيديو الخدمة'), findsWidgets);
      expect(find.text('https://weaa-sa.com/videos/iron-dome'), findsOneWidget);
      expect(find.text('الاسم الكامل'), findsOneWidget);
      expect(find.text('رقم الجوال'), findsOneWidget);
      expect(find.text('البريد الإلكتروني'), findsOneWidget);
      expect(find.text('نوع الخدمة: القبة الحديدية'), findsOneWidget);
      expect(find.text('آراء العملاء'), findsOneWidget);
      expect(find.text('مالك أصول لوجستية'), findsOneWidget);
    },
  );

  testWidgets('invalid service slug falls back to services page', (
    tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: WeaaApp(initialLocation: '/services/not-real'),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('القطاعات التي تعمل داخل وعاء'), findsOneWidget);
    expect(find.text('تفاصيل الخدمة'), findsNothing);
  });

  testWidgets('initiatives route renders the initiatives page', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: WeaaApp(initialLocation: '/initiatives')),
    );
    await tester.pumpAndSettle();

    expect(find.text('المبادرات'), findsWidgets);
    expect(find.text('عدّي على يدي'), findsOneWidget);
  });

  testWidgets('contact route renders official contact channels', (
    tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(child: WeaaApp(initialLocation: '/contact')),
    );
    await tester.pumpAndSettle();

    expect(find.text('القنوات الرسمية'), findsOneWidget);
    expect(find.text('+966567018977'), findsWidgets);
    expect(find.text('info@weaa-sa.com'), findsWidgets);
  });

  testWidgets('old concept routes no longer render design archive pages', (
    tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(child: WeaaApp(initialLocation: '/1')),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('/01'), findsNothing);
    expect(find.text('الواجهة المعتمدة'), findsOneWidget);
  });

  testWidgets('admin route renders CMS tabs and editor surfaces', (
    tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(child: WeaaApp(initialLocation: '/admin')),
    );
    await tester.pumpAndSettle();

    expect(find.text('لوحة الأدمن'), findsWidgets);
    expect(find.text('نظرة عامة'), findsOneWidget);
    expect(find.text('الصفحات'), findsOneWidget);
    expect(find.text('الخدمات'), findsWidgets);
    expect(find.text('معلومات عامة'), findsWidgets);
    expect(find.text('الفيديوهات'), findsOneWidget);
    expect(find.text('الريڤيوز'), findsOneWidget);
    expect(find.text('طلبات العملاء'), findsOneWidget);
    expect(find.text('بيانات الشركة'), findsOneWidget);
    expect(find.text('الفورم'), findsOneWidget);
  });

  testWidgets('admin text edits save only after pressing the save button', (
    tester,
  ) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const WeaaApp(initialLocation: '/admin'),
      ),
    );
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('بيانات الشركة'));
    await tester.tap(find.text('بيانات الشركة'));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const ValueKey('cms-field-اسم الشركة')),
      'شركة وعاء الجديدة',
    );
    await tester.pumpAndSettle();

    expect(
      container.read(cmsProvider).company.nameAr,
      isNot('شركة وعاء الجديدة'),
    );
    expect(find.text('تعديلات غير محفوظة'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('cms-save-اسم الشركة')));
    await tester.pumpAndSettle();

    expect(container.read(cmsProvider).company.nameAr, 'شركة وعاء الجديدة');
    expect(find.text('تم الحفظ'), findsWidgets);
  });

  testWidgets('service request form accepts input and reaches admin state', (
    tester,
  ) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const WeaaApp(initialLocation: '/services/iron-dome'),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(_field('request-name'), 'خالد');
    await tester.enterText(_field('request-phone'), '+966500000000');
    await tester.enterText(_field('request-email'), 'client@example.com');
    await tester.enterText(
      _field('request-details'),
      'أحتاج عرض سعر وتشغيل مبدئي',
    );
    await tester.ensureVisible(
      find.byKey(const ValueKey('submit-service-request')),
    );
    await tester.tap(find.byKey(const ValueKey('submit-service-request')));
    await tester.pumpAndSettle();

    final requests = container.read(cmsProvider).serviceRequests;
    expect(requests, hasLength(1));
    expect(requests.first.name, 'خالد');
    expect(requests.first.serviceTitle, 'القبة الحديدية');
    expect(requests.first.details, 'أحتاج عرض سعر وتشغيل مبدئي');
    expect(find.text('تم إرسال الطلب إلى لوحة الأدمن'), findsOneWidget);
  });

  testWidgets('admin can add a review to a service', (tester) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const WeaaApp(initialLocation: '/admin'),
      ),
    );
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('الريڤيوز'));
    await tester.tap(find.text('الريڤيوز'));
    await tester.pumpAndSettle();
    await tester.enterText(
      _field('new-review-customer-iron-dome'),
      'عميل جديد',
    );
    await tester.enterText(
      _field('new-review-body-iron-dome'),
      'الخدمة وصلتني بشكل واضح ومنظم.',
    );
    await tester.tap(find.byKey(const ValueKey('add-review-iron-dome')));
    await tester.pumpAndSettle();

    final service = container
        .read(cmsProvider)
        .serviceModels
        .firstWhere((item) => item.slug == 'iron-dome');
    expect(service.reviews.first.customer, 'عميل جديد');
    expect(service.reviews.first.body, 'الخدمة وصلتني بشكل واضح ومنظم.');
    expect(service.reviews.first.dateLabel, 'من لوحة الأدمن');
  });

  testWidgets('CMS state edits are reflected by public pages', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: _CmsEditHarness()));
    await tester.pumpAndSettle();

    expect(find.text('شركة وعاء المعدلة'), findsWidgets);
    expect(find.text('تاجلاين معدل من لوحة الأدمن'), findsWidgets);
  });
}

Finder _field(String key) {
  return find.descendant(
    of: find.byKey(ValueKey(key)),
    matching: find.byType(EditableText),
  );
}

class _CmsEditHarness extends ConsumerStatefulWidget {
  const _CmsEditHarness();

  @override
  ConsumerState<_CmsEditHarness> createState() => _CmsEditHarnessState();
}

class _CmsEditHarnessState extends ConsumerState<_CmsEditHarness> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
      () => ref
          .read(cmsProvider.notifier)
          .updateCompany(
            nameAr: 'شركة وعاء المعدلة',
            taglineAr: 'تاجلاين معدل من لوحة الأدمن',
          ),
    );
  }

  @override
  Widget build(BuildContext context) => const WeaaApp();
}
