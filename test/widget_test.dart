import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:weaa/main.dart';

void main() {
  testWidgets('home route renders the WEAA production landing', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: WeaaApp()));
    await tester.pumpAndSettle();

    expect(find.text('شركة وعاء للخدمات اللوجستية والإدارية'), findsWidgets);
    expect(find.text('الواجهة المعتمدة'), findsOneWidget);
    expect(find.text('معلومات عامة'), findsWidgets);
    expect(find.text('الخدمات'), findsWidgets);
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
      expect(find.text('لينك فيديو الخدمة'), findsOneWidget);
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
    expect(find.text('بيانات الشركة'), findsOneWidget);
    expect(find.text('الفورم'), findsOneWidget);
  });

  testWidgets('CMS state edits are reflected by public pages', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: _CmsEditHarness()));
    await tester.pumpAndSettle();

    expect(find.text('شركة وعاء المعدلة'), findsWidgets);
    expect(find.text('تاجلاين معدل من لوحة الأدمن'), findsWidgets);
  });
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
