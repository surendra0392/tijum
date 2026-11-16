@extends('emails.layouts.tijum')

@section('content')
<div style="font-size: 15px; line-height: 1.6; color: #442F41;">
    {!! $contentHtml !!}
</div>

<div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #E6E0DB; font-size: 12px; color: #8B6B82; text-align: center;">
    <p style="margin: 0 0 8px 0;">You are receiving this email because you opted in to marketing updates from TIJUM.</p>
    @if (!empty($unsubscribeUrl))
        <p style="margin: 0;">
            <a href="{{ $unsubscribeUrl }}" style="color: #FF7A67; text-decoration: underline;">Unsubscribe from marketing emails</a>
        </p>
    @endif
</div>
@endsection
