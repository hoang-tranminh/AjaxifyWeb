@model IPageViewModel<SitePageData>
<div class="row">
    <div class="span12 footer">
        <hr />
        <div class="row">
            <div class="span3">
                <h3>@Html.Translate("/footer/products")</h3>
                @Html.PropertyFor(x => x.Layout.ProductPages)
            </div>
            <div class="span3">
                <h3>@Html.Translate("/footer/company")</h3>
                @Html.PropertyFor(x => x.Layout.CompanyInformationPages)
            </div>
            <div class="span3">
                <h3>@Html.Translate("/footer/news")</h3>
                @Html.PropertyFor(x => x.Layout.NewsPages)
            </div>
            <div class="span3">
                <h3>@Html.Translate("/footer/customerzone")</h3>
                @Html.PropertyFor(x => x.Layout.CustomerZonePages)
                <ul>
                    <li>
                        @if(Model.Layout.LoggedIn)
                        {
                            @Html.ActionLink(Html.Translate("/footer/logout"), "Logout")
                        } 
                        else
                        {
                            <a href="@Model.Layout.LoginUrl" title="@Html.Translate("/footer/login")">@Html.Translate("/footer/login")</a>
                        }
                    </li>
                </ul>
            </div>
        </div>
    </div>
</div>
