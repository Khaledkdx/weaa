import 'package:flutter/material.dart';

class ServiceVideoEmbed extends StatelessWidget {
  const ServiceVideoEmbed({
    required this.embedUrl,
    required this.title,
    super.key,
  });

  final String embedUrl;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Container(
      alignment: Alignment.center,
      color: const Color(0xff120d04),
      child: const Icon(
        Icons.play_circle_fill_rounded,
        color: Color(0xfff5b82e),
        size: 72,
      ),
    );
  }
}
