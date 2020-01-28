import { Component, Inject, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatDialog, MatDialogConfig } from '@angular/material';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ApiResponseData, ApiResponseError, KnoraApiConnection, ProjectResponse, ReadProject, ReadOntology, ClassDefinition } from '@knora/api';
import { ApiServiceError, ApiServiceResult, KnoraApiConnectionToken, OntologyService, Session } from '@knora/core';
import { CacheService } from 'src/app/main/cache/cache.service';
import { DialogComponent } from 'src/app/main/dialog/dialog.component';
import { DefaultSourceType, SourceTypes } from './default-data/source-types';


export interface OntologyInfo {
    id: string;
    label: string;
}

@Component({
    selector: 'app-ontology',
    templateUrl: './ontology.component.html',
    styleUrls: ['./ontology.component.scss']
})
export class OntologyComponent implements OnInit {

    // general loading status for progess indicator
    loading: boolean;

    // loading status during open-ontology-process
    loadOntology: boolean;

    // permissions of logged-in user
    session: Session;
    sysAdmin: boolean = false;
    projectAdmin: boolean = false;

    // project shortcode; as identifier in project cache service
    projectcode: string;

    // project data
    project: ReadProject;

    // ontologies
    ontologies: OntologyInfo[];

    // ontology JSON-LD object
    ontology: ReadOntology;

    ontoClasses: ClassDefinition[];

    // selected ontology
    ontologyIri: string = undefined;

    // form to select ontology from list
    ontologyForm: FormGroup;

    // i18n setup
    itemPluralMapping = {
        ontology: {
            // '=0': '0 Ontologies',
            '=1': '1 data model',
            other: '# data models'
        }
    };

    /**
     * list of all default source types (sub class of)
     */
    sourceTypes: DefaultSourceType[] = SourceTypes.data;

    @ViewChild('ontologyEditor', { read: ViewContainerRef, static: false }) ontologyEditor: ViewContainerRef;

    // @ViewChild(AddToDirective, { static: false }) addToHost: AddToDirective;

    // @ViewChild('addSourceTypeComponent', { static: false }) addSourceType: AddSourceTypeComponent;

    constructor(
        @Inject(KnoraApiConnectionToken) private knoraApiConnection: KnoraApiConnection,
        private _ontologyService: OntologyService,
        private _cache: CacheService,
        private _dialog: MatDialog,
        private _fb: FormBuilder,
        private _titleService: Title,
        private _route: ActivatedRoute,
        private _router: Router) {

        // get the shortcode of the current project
        this._route.parent.paramMap.subscribe((params: Params) => {
            this.projectcode = params.get('shortcode');
        });

        // get ontology iri from route
        if (this._route.snapshot && this._route.snapshot.params.id) {
            this.ontologyIri = decodeURIComponent(this._route.snapshot.params.id);
            this.getOntology(this.ontologyIri);
        }

        // set the page title
        if (this.ontologyIri) {
            this._titleService.setTitle('Project ' + this.projectcode + ' | Data model');
        } else {
            this._titleService.setTitle('Project ' + this.projectcode + ' | Data models');
        }
    }

    ngOnInit() {
        this.loading = true;

        // get information about the logged-in user
        this.session = JSON.parse(localStorage.getItem('session'));
        // is the logged-in user system admin?
        this.sysAdmin = this.session.user.sysAdmin;

        // default value for projectAdmin
        this.projectAdmin = this.sysAdmin;

        // set the cache
        this._cache.get(this.projectcode, this.knoraApiConnection.admin.projectsEndpoint.getProjectByShortcode(this.projectcode));

        // get the project data from cache
        this._cache.get(this.projectcode, this.knoraApiConnection.admin.projectsEndpoint.getProjectByShortcode(this.projectcode)).subscribe(
            (response: ApiResponseData<ProjectResponse>) => {
                this.project = response.body.project;

                // is logged-in user projectAdmin?
                this.projectAdmin = this.sysAdmin ? this.sysAdmin : this.session.user.projectAdmin.some(e => e === this.project.id);

                // get the ontologies for this project
                this.initList();

                this.ontologyForm = this._fb.group({
                    ontology: new FormControl({
                        value: this.ontologyIri, disabled: false
                    })
                });

                this.ontologyForm.valueChanges.subscribe(val => this.onValueChanged(val.ontology));

                this.loading = false;

            },
            (error: ApiResponseError) => {
                console.error(error);
                this.loading = false;
            }
        );
    }

    /**
     * build the list of ontologies
     */
    initList(): void {

        this.loading = true;

        this._ontologyService.getProjectOntologies(encodeURI(this.project.id)).subscribe(
            (ontologies: ApiServiceResult) => {

                if (ontologies.body['@graph'] && ontologies.body['@graph'].length > 0) {
                    // more than one ontology
                    this.ontologies = [];

                    for (const ontology of ontologies.body['@graph']) {
                        const info: OntologyInfo = {
                            id: ontology['@id'],
                            label: ontology['rdfs:label']
                        };

                        this.ontologies.push(info);
                    }

                    this.loading = false;

                } else if (ontologies.body['@id'] && ontologies.body['rdfs:label']) {
                    // only one ontology
                    this.ontologies = [
                        {
                            id: ontologies.body['@id'],
                            label: ontologies.body['rdfs:label']
                        }
                    ];

                    this.ontologyIri = ontologies.body['@id'];

                    // open this ontology
                    this.openOntologyRoute(this.ontologyIri);
                    this.getOntology(this.ontologyIri);

                    this.loading = false;
                } else {
                    // none ontology defined yet
                    this.ontologies = [];
                    this.loading = false;
                }

            },
            (error: ApiServiceError) => {
                console.error(error);
            }
        );
    }

    // update view after selecting an ontology from dropdown
    onValueChanged(id: string) {

        if (!this.ontologyForm) {
            return;
        }

        // reset and open selected ontology
        this.resetOntology(id);

    }

    // open ontology route by iri
    openOntologyRoute(id: string) {
        const goto = 'project/' + this.projectcode + '/ontologies/' + encodeURIComponent(id);
        this._router.navigateByUrl(goto, { skipLocationChange: false });
    }

    // get ontology
    getOntology(id: string) {

        // this._router.navigateByUrl('/refresh', { skipLocationChange: true }).then(
        //     () => this._router.navigate([goto])
        // );

        this.ontoClasses = [];

        this.loadOntology = true;

        // this._cache.get('currentOntology', this.knoraApiConnection.v2.onto.getOntology(id));
        // this._cache.get('currentOntology', this.knoraApiConnection.v2.onto.getOntology(id))
        this.knoraApiConnection.v2.onto.getOntology(id).subscribe(
            (response: ReadOntology) => {

                console.log('ontology', response);

                this.ontology = response;

                const classKeys: string[] = Object.keys(response.classes);

                for (const c of classKeys) {
                    this.ontoClasses.push(this.ontology.classes[c]);
                }


                // console.log('classes', this.ontoClasses);
                // }



                // this.ontologyIri = ontologyResponse.body.id;

                // select graphs of type owl:Class ( = resource classes only)

                // could be used in the json-ld converter
                // at the moment it's used in filter pipe
                /*
                for (const g of ontologyResponse.body['@graph']) {
                    if (g['@type'] === 'owl:Class') {
                        graph.push(g);
                    }
                }
                */

                this.loadOntology = false;
                // setTimeout(() => {
                //     // let ontoClasses = Object.keys(response.body.classes);


                // }, 3000);
            },
            (error: any) => {
                console.error(error);
                this.loadOntology = false;
            }
        );

    }

    // addResourceType(id: string) {
    //     console.log(id);
    //     // this.ontologyEditor.nativeElement.insertAdjacentHTML('beforeend', ``);
    //     // this.appendComponentToBody(SelectListComponent);
    // }

    // loadComponent() {
    //     const componentFactory = this._componentFactoryResolver.resolveComponentFactory(ResourceTypeComponent);
    //     // this._componentFactoryResolver.resolveComponentFactory(ResourceTypeComponent);

    //     // const viewContainerRef = this.ontologyEditor.
    //     // viewContainerRef.clear();

    //     this.ontologyEditor.createComponent(componentFactory);
    // }


    resetOntology(id: string) {

        this.ontology = undefined;
        this.openOntologyRoute(id);
        this.getOntology(id);

    }

    filterOwlClass(owlClass: any) {
        console.log(owlClass);
        return (owlClass['@type'] === 'owl:class');
    }

    openOntologyForm(mode: string, name?: string, iri?: string): void {
        const dialogConfig: MatDialogConfig = {
            width: '640px',
            position: {
                top: '112px'
            },
            data: { mode: mode, title: name, id: iri, project: this.project.shortcode }
        };

        const dialogRef = this._dialog.open(
            DialogComponent,
            dialogConfig
        );

        dialogRef.afterClosed().subscribe(() => {
            // update the view
            this.initList();
        });
    }

    openSourceTypeForm(mode: string, type: DefaultSourceType): void {
        const dialogConfig: MatDialogConfig = {
            width: '720px',
            maxHeight: '90vh',
            position: {
                top: '112px'
            },
            data: { name: type.name, title: type.label, subtitle: 'Customize source type', mode: mode }
        };

        const dialogRef = this._dialog.open(DialogComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(result => {
            // update the view
            this.getOntology(this.ontologyIri);
        });
    }

    deleteOntology(id: string) {

        console.log('deleteOntology', this.ontology);
        // let ontologyToDelete: ReadOntology;
        // let name: string;
        // let iri: string;
        // let lastModificationDate: string;

        // this._cache.get('currentOntology', this.knoraApiConnection.v2.onto.getOntology(id)).subscribe(
        //     (response: ReadOntology) => {
        //         ontologyToDelete = response;
        //     },
        //     (error: any) => {
        //         console.error(error);
        //     }
        // );
        const dialogConfig: MatDialogConfig = {
            width: '560px',
            position: {
                top: '112px'
            },
            data: { mode: 'deleteOntology', title: this.ontology.label }
        };

        const dialogRef = this._dialog.open(
            DialogComponent,
            dialogConfig
        );

        dialogRef.afterClosed().subscribe(answer => {
            if (answer === true) {
                // delete ontology and refresh the view
                this.loading = true;
                this.loadOntology = true;

                this._ontologyService.deleteOntology(id, this.ontology.lastModificationDate).subscribe(
                    (response: any) => {
                        this.ontology = undefined;
                        // get the ontologies for this project
                        const goto = 'project/' + this.projectcode + '/ontologies/';
                        this._router.navigateByUrl(goto, { skipLocationChange: true });
                        this.initList();
                        this.loading = false;
                    },
                    (error: ApiServiceError) => {
                        // TODO: show message
                        console.error(error);
                        this.loading = false;
                    }
                );

            }
        });

    }

    deleteSourceType(id: string, name: string) {
        console.log('deleteSourceType: id', id);
        console.log('deleteSourceType: label', name);

        // let ontologyWithSourceType: ReadOntology;
        // console.log('before caching', this.ontology);

        // this._cache.get('currentOntology', this.knoraApiConnection.v2.onto.getOntology(this.ontology.id)).subscribe(
        //     (response: ReadOntology) => {
        //         ontologyWithSourceType = response;
        //     },
        //     (error: any) => {
        //         console.error(error);
        //     }
        // );

        // let iri: string;
        // let lastModificationDate: string;

        // this._cache.get('currentOntology', this._ontologyService.getAllEntityDefinitionsForOntologies(this.ontologyIri)).subscribe(
        //     (response: any) => {
        //         iri = response.body['@id'] + '#' + id.split(':')[1];
        //         lastModificationDate = response.body['knora-api:lastModificationDate'];
        //     },
        //     (error: any) => {
        //         console.error(error);
        //     }
        // );

        const dialogConfig: MatDialogConfig = {
            width: '560px',
            position: {
                top: '112px'
            },
            data: { mode: 'deleteSourceType', title: name }
        };

        const dialogRef = this._dialog.open(
            DialogComponent,
            dialogConfig
        );

        dialogRef.afterClosed().subscribe(answer => {
            if (answer === true) {
                // delete resource type and refresh the view
                this.loadOntology = true;

                this._ontologyService.deleteResourceClass(id, this.ontology.lastModificationDate).subscribe(
                    (response: any) => {
                        this.getOntology(this.ontologyIri);
                    },
                    (error: ApiServiceError) => {
                        // TODO: show message
                        console.error(error);
                        this.loadOntology = false;
                    }
                );

            }
        });
    }


}
