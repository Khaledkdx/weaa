import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:weaa/main.dart';

class HomeRepository extends InMemoryCmsRepository {
  bool fail = false;
  int saves = 0;
  @override
  Future<void> save(CmsContent content) async {
    if (fail) throw StateError('save failed');
    saves++;
    await super.save(content);
  }
}

void main() {
  test(
    'legacy CMS gains ordered sections; deleted and disabled sections stay changed',
    () {
      final old = CmsContent.seed().toJson()..remove('homepageSections');
      final migrated = CmsContent.fromJson(old);
      expect(migrated.homepageSections.map((s) => s.id), [
        'intro',
        'founder',
        'individual',
        'operations',
        'transport',
        'market',
        'join',
        'contact',
      ]);
      final changed = migrated.copyWith(
        homepageSections: [
          migrated.homepageSections.last.copyWith(enabled: false),
        ],
      );
      final loaded = CmsContent.fromJson(changed.toJson());
      expect(loaded.homepageSections, hasLength(1));
      expect(loaded.homepageSections.single.enabled, isFalse);
      expect(
        CmsContent.fromJson(
          migrated.copyWith(homepageSections: []).toJson(),
        ).homepageSections,
        isEmpty,
      );
    },
  );

  test('stable references follow service and form slug edits', () {
    final cms = CmsContent.seed();
    final service = cms.serviceModels.first;
    final form = cms.joinForms.first;
    final changed = CmsContent.fromJson(
      cms
          .copyWith(
            serviceModels: [service.copyWith(slug: 'renamed-service')],
            joinForms: [form.copyWith(slug: 'renamed-form')],
          )
          .toJson(),
    );
    expect(
      homeCardTarget(
        HomeCard(
          id: 's',
          title: 'خدمة',
          destinationType: 'service',
          target: service.stableId,
        ),
        changed,
      ),
      '/services/renamed-service',
    );
    expect(
      homeCardTarget(
        HomeCard(
          id: 'f',
          title: 'نموذج',
          destinationType: 'form',
          target: form.stableId,
        ),
        changed,
      ),
      '/join-us/renamed-form',
    );
    expect(
      homeCardTarget(
        HomeCard(
          id: 'f',
          title: 'نموذج',
          destinationType: 'form',
          target: form.stableId,
        ),
        changed.copyWith(
          joinForms: [changed.joinForms.first.copyWith(enabled: false)],
        ),
      ),
      isNull,
    );
    expect(
      homeCardTarget(
        const HomeCard(id: 'd', title: 'كتاب', destinationType: 'download'),
        cms,
      ),
      isNull,
    );
    expect(
      homeCardTarget(
        const HomeCard(
          id: 'd',
          title: 'كتاب',
          destinationType: 'download',
          target: 'javascript:alert(1)',
        ),
        cms,
      ),
      isNull,
    );
    expect(
      homeCardTarget(
        const HomeCard(
          id: 'p',
          title: 'صفحة',
          destinationType: 'page',
          target: '/missing',
        ),
        cms,
      ),
      isNull,
    );
    expect(
      Uri.parse(
        homeCardTarget(const HomeCard(id: 'c', title: 'أريد بيع شركة'), cms)!,
      ).queryParameters['subject'],
      'أريد بيع شركة',
    );
  });

  test('section saves persist and failed saves do not publish edits', () async {
    final repository = HomeRepository();
    final container = ProviderContainer(
      overrides: [cmsRepositoryProvider.overrideWithValue(repository)],
    );
    addTearDown(container.dispose);
    container.read(cmsProvider);
    await Future<void>.delayed(Duration.zero);
    final sections = [...container.read(cmsProvider).homepageSections.reversed];
    await container.read(cmsProvider.notifier).saveHomepageSections(sections);
    expect(repository.saves, 1);
    expect((await repository.load()).homepageSections.first.id, 'contact');
    repository.fail = true;
    await expectLater(
      container.read(cmsProvider.notifier).saveHomepageSections([]),
      throwsStateError,
    );
    expect(container.read(cmsProvider).homepageSections, hasLength(8));
    expect(container.read(cmsSyncProvider).error, isNotNull);
  });

  testWidgets('contact request subject is prefilled from homepage CTA', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        child: WeaaApp(
          initialLocation: Uri(
            path: '/contact',
            queryParameters: {'subject': 'النقل الثقيل'},
          ).toString(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.widgetWithText(TextField, 'النقل الثقيل'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'mobile home stays readable in both themes and hides empty bio/download',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final container = ProviderContainer();
      addTearDown(container.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(container: container, child: const WeaaApp()),
      );
      await tester.pumpAndSettle();
      expect(find.text('نبذة عن خادم القوم'), findsNothing);
      expect(find.text('تحميل الكتاب'), findsNothing);
      expect(find.byType(DashboardPreview), findsNothing);
      expect(find.text('سجل الآن'), findsWidgets);
      expect(tester.takeException(), isNull);
      await tester.tap(find.byKey(const ValueKey('theme-toggle')));
      await tester.pumpAndSettle();
      expect(container.read(appThemeProvider), WeaaThemeMode.light);
      final title = tester.widget<Text>(find.text('خدمات التشغيل والعقود'));
      expect(title.style!.color, AppPalette.light.ink);
      final card = tester.widget<Material>(
        find
            .descendant(
              of: find.byType(HomepageCardTile).first,
              matching: find.byType(Material),
            )
            .first,
      );
      expect(card.color, AppPalette.light.surface);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('admin edits stay local until explicit section save', (
    tester,
  ) async {
    final repository = HomeRepository();
    final container = ProviderContainer(
      overrides: [cmsRepositoryProvider.overrideWithValue(repository)],
    );
    addTearDown(container.dispose);
    container.read(cmsProvider);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          home: Directionality(
            textDirection: TextDirection.rtl,
            child: Scaffold(
              body: HomeSectionDialog(
                section: CmsContent.seed().homepageSections[2],
                cms: CmsContent.seed(),
                onSave: (section) => container
                    .read(cmsProvider.notifier)
                    .saveHomepageSections([section]),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    final field = find.widgetWithText(TextField, 'الخدمات الفردية');
    await tester.enterText(field, 'خدمات الأفراد الجديدة');
    expect(repository.saves, 0);
    await tester.tap(find.text('حفظ القسم'));
    await tester.pumpAndSettle();
    expect(repository.saves, 1);
    expect(
      (await repository.load()).homepageSections.single.title,
      'خدمات الأفراد الجديدة',
    );
  });
}
