{{ $subject }}
==============================================

{{ !empty($contentText) ? $contentText : strip_tags($contentHtml) }}

----------------------------------------------
You are receiving this email because you opted in to marketing updates from TIJUM.
@if (!empty($unsubscribeUrl))
To unsubscribe from marketing emails, visit:
{{ $unsubscribeUrl }}
@endif

TIJUM — Stay easy. Eat well. Spend less.
Hyderabad | Guntur | Vijayawada | Visakhapatnam
