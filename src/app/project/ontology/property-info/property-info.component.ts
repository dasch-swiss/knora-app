import { AfterContentChecked, AfterContentInit, AfterViewInit, Component, Inject, Input, OnInit } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ApiResponseData, ApiResponseError, Constants, IHasProperty, KnoraApiConnection, ListsResponse, ReadOntology, ResourcePropertyDefinitionWithAllLanguages } from '@dasch-swiss/dsp-js';
import { DspApiConnectionToken } from '@dasch-swiss/dsp-ui';
import { CacheService } from 'src/app/main/cache/cache.service';
import { ErrorHandlerService } from 'src/app/main/error/error-handler.service';
import { Category, DefaultProperties, PropertyType } from '../default-data/default-properties';
import { Property } from '../resource-class-form/resource-class-form.service';

@Component({
    selector: 'app-property-info',
    templateUrl: './property-info.component.html',
    styleUrls: ['./property-info.component.scss']
})
export class PropertyInfoComponent implements OnInit, AfterContentInit {

    @Input() propDef: ResourcePropertyDefinitionWithAllLanguages;

    @Input() propCard: IHasProperty;

    @Input() projectcode: string;

    propInfo: Property = new Property();

    propType: PropertyType;

    // list of default property types
    propertyTypes: Category[] = DefaultProperties.data;

    propAttribute: string;

    constructor(
        @Inject(DspApiConnectionToken) private _dspApiConnection: KnoraApiConnection,
        private _cache: CacheService,
        private _domSanitizer: DomSanitizer,
        private _errorHandler: ErrorHandlerService,
        private _matIconRegistry: MatIconRegistry
    ) {

        // special icons for property type
        this._matIconRegistry.addSvgIcon(
            'integer_icon',
            this._domSanitizer.bypassSecurityTrustResourceUrl('/assets/images/integer-icon.svg')
        );
        this._matIconRegistry.addSvgIcon(
            'decimal_icon',
            this._domSanitizer.bypassSecurityTrustResourceUrl('/assets/images/decimal-icon.svg')
        );
    }

    ngOnInit(): void {
        // convert cardinality from js-lib convention to app convention
        switch (this.propCard.cardinality) {
            case 0:
                this.propInfo.multiple = false;
                this.propInfo.required = true;
                break;
            case 1:
                this.propInfo.multiple = false;
                this.propInfo.required = false;
                break;
            case 2:
                this.propInfo.multiple = true;
                this.propInfo.required = false;
                break;
            case 3:
                this.propInfo.multiple = true;
                this.propInfo.required = true;
                break;
        }

        // find gui ele from list of default property-types to set type value
        if (this.propDef.guiElement) {
            for (let group of this.propertyTypes) {
                this.propType = group.elements.find(i => i.gui_ele === this.propDef.guiElement && (i.objectType === this.propDef.objectType || i.subPropOf === this.propDef.subPropertyOf[0]));

                if (this.propType) {
                    break;
                }
            }
        }

    }

    ngAfterContentInit() {
        if (this.propDef.isLinkProperty) {
            // this property is a link property to another resource class
            // get current ontology to get linked res class information
            this._cache.get('currentOntology').subscribe(
                (response: ReadOntology) => {
                    this.propAttribute = response.classes[this.propDef.objectType].label;
                }
            );
        }

        if(this.propDef.objectType === Constants.ListValue) {
            console.log(this.propDef)
            // this property is a list property
            // get current ontology lists to get linked list information
            this._cache.get('currentOntologyLists').subscribe(
                (response: ApiResponseData<ListsResponse>) => {
                    const re: RegExp = /\<([^)]+)\>/;
                    const listIri = this.propDef.guiAttributes[0].match(re)[1];
                    const listUrl = `/project/${this.projectcode}/lists/${encodeURIComponent(listIri)}`;
                    console.log(listIri)
                    console.log(response)
                    this.propAttribute = `<a href="${listUrl}">${response[0].labels[0].value}</a>`;
                }
            );
        }

    }

}