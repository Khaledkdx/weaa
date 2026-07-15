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

  testWidgets('theme toggle switches between dark and light palettes', (
    tester,
  ) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(container: container, child: const WeaaApp()),
    );
    await tester.pumpAndSettle();

    expect(container.read(appThemeProvider), WeaaThemeMode.dark);
    expect(find.text('الوضع الفاتح'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('theme-toggle')));
    await tester.pumpAndSettle();

    expect(container.read(appThemeProvider), WeaaThemeMode.light);
    expect(find.text('الوضع الداكن'), findsOneWidget);
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
    expect(find.text('الحجوزات'), findsOneWidget);
    expect(find.text('الرسائل'), findsOneWidget);
    expect(find.text('الصلاحيات'), findsOneWidget);
    expect(find.text('بيانات الشركة'), findsOneWidget);
    expect(find.text('الفورم'), findsOneWidget);
  });

  testWidgets('services route hides public admin operations matrix', (
    tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(child: WeaaApp(initialLocation: '/services')),
    );
    await tester.pumpAndSettle();

    expect(find.text('المدفوعات'), findsNothing);
    expect(find.text('Stripe لاحقًا'), findsNothing);
    expect(find.text('الحجوزات'), findsNothing);
    expect(find.text('الرسائل'), findsNothing);
    expect(find.text('الصلاحيات'), findsNothing);
    expect(find.text('من طلبات العملاء'), findsNothing);
    expect(find.text('تصل إلى الأدمن'), findsNothing);
    expect(find.text('أدوار CMS'), findsNothing);
  });

  testWidgets('contact form sends message to admin state', (tester) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const WeaaApp(initialLocation: '/contact'),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(_field('contact-name'), 'عميل تواصل');
    await tester.enterText(_field('contact-phone'), '+966511111111');
    await tester.enterText(_field('contact-email'), 'message@example.com');
    await tester.enterText(_field('contact-subject'), 'استفسار تشغيل');
    await tester.enterText(
      _field('contact-body'),
      'أحتاج معرفة تفاصيل الخدمة.',
    );
    await tester.ensureVisible(
      find.byKey(const ValueKey('submit-contact-message')),
    );
    await tester.tap(find.byKey(const ValueKey('submit-contact-message')));
    await tester.pumpAndSettle();

    final messages = container.read(cmsProvider).contactMessages;
    expect(messages, hasLength(1));
    expect(messages.first.name, 'عميل تواصل');
    expect(messages.first.subject, 'استفسار تشغيل');
    expect(messages.first.status, 'جديدة');
    expect(find.text('تم إرسال الرسالة إلى لوحة الأدمن'), findsOneWidget);
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
    await tester.ensureVisible(
      find.byKey(const ValueKey('add-review-iron-dome')),
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

  testWidgets(
    'admin CMS can add services, benefits, reviews, and form fields',
    (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final controller = container.read(cmsProvider.notifier);
      await controller.addItem(CmsCollection.serviceModels);
      final added = container.read(cmsProvider).serviceModels.last;
      expect(added.slug, isNotEmpty);

      await controller.updateItem(
        collection: CmsCollection.serviceModels,
        index: container.read(cmsProvider).serviceModels.length - 1,
        titleAr: 'خدمة اختبار',
        titleEn: 'Test Service',
        slug: 'test-service',
      );
      expect(
        container.read(cmsProvider).serviceModels.last.slug,
        'test-service',
      );

      await controller.addBenefit('test-service');
      await controller.updateBenefit('test-service', 0, 'مخرج اختبار');
      expect(
        container.read(cmsProvider).serviceModels.last.benefits.first,
        'مخرج اختبار',
      );

      await controller.addReview(
        'test-service',
        const CmsReview('عميل', 'تجربة واضحة', 'اليوم', 4),
      );
      await controller.updateReview('test-service', 0, rating: 5);
      expect(
        container.read(cmsProvider).serviceModels.last.reviews.first.rating,
        5,
      );

      await controller.addFormLabel();
      await controller.updateFormLabel(
        container.read(cmsProvider).formLabels.length - 1,
        'حقل اختبار',
      );
      expect(container.read(cmsProvider).formLabels.last, 'حقل اختبار');

      await controller.submitContactMessage(
        const ContactMessage(
          name: 'مرسل',
          phone: '+966522222222',
          email: 'sender@example.com',
          subject: 'موضوع',
          body: 'رسالة اختبار',
          createdAtLabel: 'الآن',
        ),
      );
      expect(container.read(cmsProvider).contactMessages.first.status, 'جديدة');
      await controller.updateContactMessageStatus(
        container.read(cmsProvider).contactMessages.first.id,
        'قيد الرد',
      );
      expect(
        container.read(cmsProvider).contactMessages.first.status,
        'قيد الرد',
      );

      await controller.addAdminRole();
      final role = container.read(cmsProvider).adminRoles.last;
      await controller.updateAdminRole(role.id, name: 'مختبر صلاحيات');
      await controller.toggleAdminRolePermission(role.id, 'الرسائل');
      expect(container.read(cmsProvider).adminRoles.last.name, 'مختبر صلاحيات');
      expect(
        container.read(cmsProvider).adminRoles.last.permissions,
        contains('الرسائل'),
      );
    },
  );

  testWidgets('admin bookings tab updates a booking to confirmed', (
    tester,
  ) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final controller = container.read(cmsProvider.notifier);
    await controller.submitServiceRequest(
      const ServiceRequest(
        id: 'booking-test',
        serviceSlug: 'iron-dome',
        serviceTitle: 'القبة الحديدية',
        name: 'عميل حجز',
        phone: '+966533333333',
        email: 'booking@example.com',
        details: 'تفاصيل حجز تشغيلية',
        createdAtLabel: 'الآن',
      ),
    );

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const WeaaApp(initialLocation: '/admin'),
      ),
    );
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('الحجوزات'));
    await tester.tap(find.text('الحجوزات'));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('booking-stats-strip')), findsOneWidget);
    expect(find.text('عميل حجز'), findsOneWidget);
    expect(find.text('تفاصيل حجز تشغيلية'), findsOneWidget);

    final confirmedChip = find.byKey(
      const ValueKey('booking-status-booking-test-مؤكد'),
    );
    await tester.ensureVisible(confirmedChip);
    await tester.tap(confirmedChip);
    await tester.pumpAndSettle();

    expect(container.read(cmsProvider).serviceRequests.first.status, 'مؤكد');
    expect(find.text('تم تحديث حالة الحجز إلى مؤكد'), findsOneWidget);
  });

  testWidgets('admin messages tab updates a message status', (tester) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final controller = container.read(cmsProvider.notifier);
    await controller.submitContactMessage(
      const ContactMessage(
        id: 'message-test',
        name: 'مرسل رسالة',
        phone: '+966544444444',
        email: 'message-ui@example.com',
        subject: 'رسالة متابعة',
        body: 'نص رسالة للوحة الأدمن',
        createdAtLabel: 'الآن',
      ),
    );

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const WeaaApp(initialLocation: '/admin'),
      ),
    );
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('الرسائل'));
    await tester.tap(find.text('الرسائل'));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('message-stats-strip')), findsOneWidget);
    expect(find.text('مرسل رسالة'), findsOneWidget);
    expect(find.text('نص رسالة للوحة الأدمن'), findsOneWidget);

    final repliedChip = find.byKey(
      const ValueKey('message-status-message-test-تم الرد'),
    );
    await tester.ensureVisible(repliedChip);
    await tester.tap(repliedChip);
    await tester.pumpAndSettle();

    expect(container.read(cmsProvider).contactMessages.first.status, 'تم الرد');
    expect(find.text('تم تحديث حالة الرسالة إلى تم الرد'), findsOneWidget);
  });

  testWidgets('admin permissions tab toggles CMS role permissions', (
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

    await tester.ensureVisible(find.text('الصلاحيات'));
    await tester.tap(find.text('الصلاحيات'));
    await tester.pumpAndSettle();

    expect(
      find.byKey(const ValueKey('permissions-stats-strip')),
      findsOneWidget,
    );
    final pagesPermission = find.byKey(
      const ValueKey('permission-requests-agent-الصفحات'),
    );
    await tester.ensureVisible(pagesPermission);
    await tester.tap(pagesPermission);
    await tester.pumpAndSettle();

    final role = container
        .read(cmsProvider)
        .adminRoles
        .firstWhere((item) => item.id == 'requests-agent');
    expect(role.permissions, contains('الصفحات'));
    expect(find.text('تم تحديث صلاحيات متابع طلبات'), findsOneWidget);
  });

  testWidgets('admin CMS rejects duplicate service slugs', (tester) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    expect(
      () => container
          .read(cmsProvider.notifier)
          .updateItem(
            collection: CmsCollection.serviceModels,
            index: 1,
            slug: 'iron-dome',
          ),
      throwsA(isA<StateError>()),
    );
  });

  testWidgets('new CMS service appears on public routes', (tester) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final controller = container.read(cmsProvider.notifier);

    await controller.addItem(CmsCollection.serviceModels);
    await controller.updateItem(
      collection: CmsCollection.serviceModels,
      index: container.read(cmsProvider).serviceModels.length - 1,
      titleAr: 'خدمة اختبار عامة',
      titleEn: 'Public Test Service',
      slug: 'public-test-service',
      description: 'وصف خدمة الاختبار العامة.',
    );

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const WeaaApp(initialLocation: '/frameworks'),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('خدمة اختبار عامة'), findsWidgets);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const WeaaApp(initialLocation: '/services/public-test-service'),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('تفاصيل الخدمة'), findsOneWidget);
    expect(find.text('خدمة اختبار عامة'), findsWidgets);
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
