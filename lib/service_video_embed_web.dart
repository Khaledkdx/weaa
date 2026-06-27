import 'dart:ui_web' as ui_web;

import 'package:flutter/widgets.dart';
import 'package:web/web.dart' as web;

class ServiceVideoEmbed extends StatefulWidget {
  const ServiceVideoEmbed({
    required this.embedUrl,
    required this.title,
    super.key,
  });

  final String embedUrl;
  final String title;

  @override
  State<ServiceVideoEmbed> createState() => _ServiceVideoEmbedState();
}

class _ServiceVideoEmbedState extends State<ServiceVideoEmbed> {
  late final String viewType;
  late final web.HTMLIFrameElement iframe;

  @override
  void initState() {
    super.initState();
    viewType =
        'weaa-service-video-${widget.embedUrl.hashCode}-${DateTime.now().microsecondsSinceEpoch}';
    iframe = web.HTMLIFrameElement()
      ..src = widget.embedUrl
      ..title = widget.title
      ..allow =
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
      ..allowFullscreen = true
      ..style.border = '0'
      ..style.width = '100%'
      ..style.height = '100%'
      ..style.borderRadius = '24px'
      ..style.backgroundColor = '#071018';
    ui_web.platformViewRegistry.registerViewFactory(viewType, (_) => iframe);
  }

  @override
  void didUpdateWidget(covariant ServiceVideoEmbed oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.embedUrl != widget.embedUrl) {
      iframe.src = widget.embedUrl;
    }
    if (oldWidget.title != widget.title) {
      iframe.title = widget.title;
    }
  }

  @override
  Widget build(BuildContext context) => HtmlElementView(viewType: viewType);
}
