using EPiServer.Core;

namespace AjaxifyWeb.Models.Pages
{
    public interface IHasRelatedContent
    {
        ContentArea RelatedContentArea { get; }
    }
}
