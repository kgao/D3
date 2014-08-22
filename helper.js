//JS: OKC_GO
javascript:(function(){%20%20function%20doIt()%20{%20%20%20%20jQuery('a[data-value="5"]')[0].click();%20%20}%20%20jQuery('#note').on('DOMSubtreeModified',%20doIt);%20%20doIt();})()